import { Router, type Request, type Response } from "express";
import { env } from "../../config/env.js";
import { q } from "../../db/pool.js";
import { audit } from "../../lib/audit.js";
import { asyncH, HttpError } from "../../lib/http.js";
import { logger } from "../../lib/logger.js";
import { limiter } from "../../middleware/security.js";
import { sha256Hex } from "../../security/crypto.js";
import { etiquetaEstado } from "../orders/estados.js";
import { reconcile } from "./reconcile.js";
import { fetchTransaction as defaultFetch, verifyEvent, type FetchTransaction, type WompiEvent } from "./wompi.js";

/** Se construye con la función de consulta inyectable (en pruebas se reemplaza por un doble) */
export function paymentsRouter(fetchTx: FetchTransaction = defaultFetch) {
  const r = Router();

  /** URL de eventos que se registra en el dashboard de Wompi: https://<dominio>/api/payments/wompi/webhook */
  const webhook = asyncH(async (req: Request, res: Response) => {
    const raw = req.rawBody;
    if (!raw?.length) throw new HttpError(400, "VACIO", "Evento vacío.");
    const ev = req.body as WompiEvent;
    const eventHash = sha256Hex(raw);
    const registrar = (signatureOk: boolean, outcome: string) =>
      q(
        `INSERT INTO payment_events(event_hash, event, transaction_id, reference, status, amount_in_cents, signature_ok, outcome)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (event_hash) DO NOTHING`,
        [eventHash, String(ev?.event || "?").slice(0, 60), ev?.data?.transaction?.id ?? null, ev?.data?.transaction?.reference ?? null,
         ev?.data?.transaction?.status ?? null, ev?.data?.transaction?.amount_in_cents ?? null, signatureOk, outcome]
      );

    // 1) Idempotencia: el mismo evento (reintento de Wompi o repetición maliciosa) se procesa una sola vez
    const dup = await q("SELECT 1 FROM payment_events WHERE event_hash = $1 AND signature_ok", [eventHash]);
    if (dup.rowCount) return res.json({ ok: true, duplicado: true });

    // 2) Firma
    if (!verifyEvent(ev, req.get("x-event-checksum") || undefined)) {
      await registrar(false, "firma_invalida");
      void audit("payment.event.invalid_signature", req, { evento: ev?.event });
      throw new HttpError(401, "FIRMA", "Firma inválida.");
    }

    // 3) Antigüedad (anti-replay de eventos viejos)
    const edadH = (Date.now() / 1000 - ev.timestamp) / 3600;
    if (edadH > env.WOMPI_EVENT_MAX_AGE_HOURS || edadH < -0.25) {
      await registrar(true, "evento_vencido");
      void audit("payment.event.stale", req, { horas: Math.round(edadH) });
      throw new HttpError(400, "VENCIDO", "Evento fuera de tiempo.");
    }

    if (ev.event !== "transaction.updated" || !ev.data.transaction) {
      await registrar(true, "ignorado");
      return res.json({ ok: true });
    }

    // 4) Doble verificación contra la API de Wompi: el pedido solo cambia si Wompi confirma los mismos datos
    let t = ev.data.transaction;
    if (env.WOMPI_VERIFY_WITH_API) {
      const api = await fetchTx(t.id);
      if (!api || api.reference !== t.reference || Number(api.amount_in_cents) !== Number(t.amount_in_cents) || api.status !== t.status) {
        await registrar(true, "no_confirmado_api");
        void audit("payment.event.mismatch", req, { reference: t.reference, motivo: "api" });
        return res.json({ ok: true });
      }
      t = api;
    }

    const out = await reconcile(t, req);
    await registrar(true, out.outcome);
    void audit("payment.event.processed", req, { reference: t.reference, outcome: out.outcome });
    res.json({ ok: true });
  });

  /** Página de retorno: Wompi redirige a /pago/resultado?id=<transacción>. Se consulta la API (nunca se confía en la URL). */
  r.get(
    "/wompi/result",
    limiter("pago-resultado", 5, 30),
    asyncH(async (req, res) => {
      const id = String(req.query.id || "");
      if (!/^[\w-]{5,80}$/.test(id)) throw new HttpError(400, "ID", "Transacción inválida.");
      let reference: string | undefined;
      if (env.WOMPI_VERIFY_WITH_API) {
        try {
          const t = await fetchTx(id);
          if (t) reference = (await reconcile(t, req)).reference ?? t.reference;
        } catch (e) {
          logger.warn({ err: e }, "no se pudo consultar Wompi");
        }
      }
      const { rows } = await q<{ reference: string; status: string; total: number }>(
        reference ? "SELECT reference, status, total FROM orders WHERE reference = $1" : "SELECT reference, status, total FROM orders WHERE wompi_transaction_id = $1",
        [reference ?? id]
      );
      const o = rows[0];
      if (!o) return res.json({ estado: "PROCESANDO", etiqueta: "Estamos confirmando tu pago con la entidad. Revisa en unos minutos." });
      res.json({ reference: o.reference, estado: o.status, etiqueta: etiquetaEstado(o.status), total: o.total });
    })
  );
  return { router: r, webhook };
}
