/* Panel administrativo (API). Solo rol admin con segundo factor. Cada lectura de datos personales queda auditada.
   Un administrador NO puede marcar un pedido como pagado: eso solo ocurre cuando Wompi lo confirma. */
import { Router } from "express";
import { z } from "zod";
import { q } from "../../db/pool.js";
import { audit } from "../../lib/audit.js";
import { asyncH, HttpError, parseBody } from "../../lib/http.js";
import { requireAuth } from "../../middleware/security.js";
import { decryptOpt } from "../../security/crypto.js";

export const adminRouter = Router();
adminRouter.use(requireAuth("admin"));

const page = (v: unknown) => Math.max(1, Math.min(1000, Number(v) || 1));

adminRouter.get(
  "/orders",
  asyncH(async (req, res) => {
    const estado = typeof req.query.estado === "string" ? req.query.estado : null;
    const p = page(req.query.page);
    const { rows } = await q(
      `SELECT reference, status, payment_method, items, total, created_at, paid_at, anonymized_at,
              nombre_enc, telefono_enc, email_enc, direccion_enc, barrio_enc, notas_enc
         FROM orders WHERE ($1::text IS NULL OR status = $1) ORDER BY created_at DESC LIMIT 50 OFFSET $2`,
      [estado, (p - 1) * 50]
    );
    void audit("admin.pii.read", req, { recurso: "orders", filas: rows.length, pagina: p });
    res.json({
      pagina: p,
      pedidos: rows.map((o) => ({
        reference: o.reference, estado: o.status, metodo: o.payment_method, items: o.items, total: o.total, creado: o.created_at, pagado: o.paid_at,
        cliente: o.anonymized_at ? null : {
          nombre: decryptOpt(o.nombre_enc, "orders.nombre"), telefono: decryptOpt(o.telefono_enc, "orders.telefono"), email: decryptOpt(o.email_enc, "orders.email"),
          direccion: decryptOpt(o.direccion_enc, "orders.direccion"), barrio: decryptOpt(o.barrio_enc, "orders.barrio"), notas: decryptOpt(o.notas_enc, "orders.notas")
        }
      }))
    });
  })
);

/** Estados logísticos que puede fijar el equipo (nunca PAGADO) y desde cuáles */
const LOGISTICA: Record<string, string[]> = {
  EN_PREPARACION: ["PAGADO", "POR_CONFIRMAR"],
  EN_CAMINO: ["EN_PREPARACION"],
  ENTREGADO: ["EN_CAMINO"],
  CANCELADO: ["POR_CONFIRMAR", "PENDIENTE_PAGO", "RECHAZADO", "ERROR_PAGO", "EN_PREPARACION"]
};

adminRouter.patch(
  "/orders/:reference/estado",
  asyncH(async (req, res) => {
    const { estado } = parseBody(z.object({ estado: z.enum(["EN_PREPARACION", "EN_CAMINO", "ENTREGADO", "CANCELADO"]) }).strict(), req.body);
    const ref = String(req.params.reference || "");
    const r = await q("UPDATE orders SET status = $2 WHERE reference = $1 AND status = ANY($3::text[]) RETURNING reference", [ref, estado, LOGISTICA[estado]]);
    if (!r.rowCount) throw new HttpError(409, "TRANSICION", "El pedido no existe o no puede pasar a ese estado.");
    void audit("admin.order.status", req, { reference: ref, estado });
    res.json({ ok: true });
  })
);

adminRouter.get(
  "/leads",
  asyncH(async (req, res) => {
    const { rows } = await q("SELECT id, negocio_enc, tipo, nombre_enc, telefono_enc, ciudad, status, created_at FROM leads_mayoristas ORDER BY created_at DESC LIMIT 100");
    void audit("admin.pii.read", req, { recurso: "leads", filas: rows.length });
    res.json({
      solicitudes: rows.map((l) => ({
        id: l.id, tipo: l.tipo, ciudad: l.ciudad, estado: l.status, creado: l.created_at,
        negocio: decryptOpt(l.negocio_enc, "leads.negocio"), nombre: decryptOpt(l.nombre_enc, "leads.nombre"), telefono: decryptOpt(l.telefono_enc, "leads.telefono")
      }))
    });
  })
);

adminRouter.get(
  "/privacy",
  asyncH(async (req, res) => {
    const { rows } = await q("SELECT radicado, tipo, nombre_enc, telefono_enc, email_enc, detalle_enc, status, due_at, created_at, resolved_at FROM privacy_requests ORDER BY due_at ASC LIMIT 100");
    void audit("admin.pii.read", req, { recurso: "privacy", filas: rows.length });
    res.json({
      solicitudes: rows.map((r) => ({
        radicado: r.radicado, tipo: r.tipo, estado: r.status, vence: r.due_at, creado: r.created_at, resuelto: r.resolved_at,
        nombre: decryptOpt(r.nombre_enc, "privacy.nombre"), telefono: decryptOpt(r.telefono_enc, "privacy.telefono"), email: decryptOpt(r.email_enc, "privacy.email"),
        detalle: decryptOpt(r.detalle_enc, "privacy.detalle")
      }))
    });
  })
);

adminRouter.patch(
  "/privacy/:radicado",
  asyncH(async (req, res) => {
    const { estado } = parseBody(z.object({ estado: z.enum(["EN_TRAMITE", "RESUELTA"]) }).strict(), req.body);
    const r = await q("UPDATE privacy_requests SET status = $2, resolved_at = CASE WHEN $2 = 'RESUELTA' THEN now() ELSE NULL END WHERE radicado = $1 RETURNING radicado", [String(req.params.radicado), estado]);
    if (!r.rowCount) throw new HttpError(404, "NO_ENCONTRADO", "Radicado no encontrado.");
    void audit("admin.privacy.update", req, { radicado: req.params.radicado, estado });
    res.json({ ok: true });
  })
);
