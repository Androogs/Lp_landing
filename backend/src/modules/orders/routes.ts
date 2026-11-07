/* Pedidos: el servidor es la ÚNICA fuente de verdad de precios y totales. Lo que envía el navegador (precios, totales) se ignora. */
import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { q, tx } from "../../db/pool.js";
import { audit } from "../../lib/audit.js";
import { registrarConsentimiento } from "../../lib/consent.js";
import { asyncH, celularCO, HttpError, parseBody, texto } from "../../lib/http.js";
import { limiter } from "../../middleware/security.js";
import { blindIndex, encrypt, encryptOpt, safeEqual } from "../../security/crypto.js";
import { checkoutUrl } from "../payments/wompi.js";
import { etiquetaEstado, pasoEstado } from "./estados.js";

export const ordersRouter = Router();

export const MINIMO_MAYOR = 10;
const TOTAL_MAXIMO = 30_000_000; // COP: tope de seguridad por pedido web (pedidos mayores, por asesor)

const itemSchema = z.object({ id: z.string().regex(/^p\d{1,4}$/), qty: z.number().int().min(1).max(500) }).strict();

export const orderSchema = z
  .object({
    items: z
      .array(itemSchema)
      .min(1)
      .max(60)
      .refine((it) => new Set(it.map((i) => i.id)).size === it.length, "productos repetidos"),
    cliente: z
      .object({
        nombre: texto(3, 80),
        telefono: celularCO,
        email: z.string().trim().toLowerCase().email().max(120).optional().or(z.literal("").transform(() => undefined)),
        direccion: texto(5, 160),
        barrio: texto(2, 80).optional(),
        notas: texto(0, 300).optional()
      })
      .strict(),
    metodo: z.enum(["wompi", "contraentrega"]),
    autorizacionDatos: z.literal(true, { error: "debes autorizar el tratamiento de datos" }),
    mayorDeEdad: z.literal(true, { error: "la venta es solo para mayores de 18 años" })
  })
  .strict();

/** Referencia no adivinable: LP- + 10 caracteres (≈50 bits), sin caracteres ambiguos */
const ALFABETO = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
export function nuevaReferencia(): string {
  const b = randomBytes(10);
  return "LP-" + Array.from(b, (x) => ALFABETO[x % 32]).join("");
}

ordersRouter.post(
  "/",
  limiter("pedidos", 60, 15),
  asyncH(async (req, res) => {
    const body = parseBody(orderSchema, req.body);
    const ids = body.items.map((i) => i.id);
    const { rows: prods } = await q<{ id: string; nombre: string; presentacion: string; detal: number; mayor: number; stock: string }>(
      "SELECT id, nombre, presentacion, detal, mayor, stock FROM products WHERE activo AND id = ANY($1::text[])",
      [ids]
    );
    const porId = new Map(prods.map((p) => [p.id, p]));
    const faltan = ids.filter((id) => !porId.has(id));
    if (faltan.length) throw new HttpError(400, "PRODUCTO", "Algunos productos ya no están disponibles.", { productos: faltan });
    const agotados = prods.filter((p) => p.stock === "agotado").map((p) => p.id);
    if (agotados.length) throw new HttpError(409, "AGOTADO", "Algunos productos están agotados.", { productos: agotados });

    const esMayorista = req.session?.rol === "mayorista";
    const items = body.items.map(({ id, qty }) => {
      const p = porId.get(id)!;
      // el precio mayorista nunca puede ser más caro que el detal (p. ej. cuando el detal está en oferta)
      const unit = esMayorista || qty >= MINIMO_MAYOR ? Math.min(p.mayor, p.detal) : p.detal;
      return { id, nombre: p.nombre, presentacion: p.presentacion, qty, unit, subtotal: unit * qty };
    });
    const total = items.reduce((s, i) => s + i.subtotal, 0);
    if (total > TOTAL_MAXIMO) throw new HttpError(400, "TOTAL", "Para pedidos de este valor te atiende un asesor por WhatsApp.");

    const c = body.cliente;
    const telBidx = blindIndex(c.telefono, "telefono");
    const reference = nuevaReferencia();
    const status = body.metodo === "wompi" ? "PENDIENTE_PAGO" : "POR_CONFIRMAR";

    await tx(async (cx) => {
      const consentId = await registrarConsentimiento(cx, req, "pedido", telBidx);
      await cx.query(
        `INSERT INTO orders(reference, status, payment_method, user_id, items, total, amount_in_cents, currency,
                            nombre_enc, telefono_enc, telefono_bidx, email_enc, direccion_enc, barrio_enc, notas_enc, consent_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'COP',$8,$9,$10,$11,$12,$13,$14,$15)`,
        [reference, status, body.metodo, req.session?.userId ?? null, JSON.stringify(items), total, total * 100,
         encrypt(c.nombre, "orders.nombre"), encrypt(c.telefono, "orders.telefono"), telBidx, encryptOpt(c.email, "orders.email"),
         encrypt(c.direccion, "orders.direccion"), encryptOpt(c.barrio, "orders.barrio"), encryptOpt(c.notas, "orders.notas"), consentId]
      );
    });
    void audit("order.created", req, { reference, metodo: body.metodo, total, lineas: items.length });

    res.status(201).json({
      reference,
      estado: status,
      etiqueta: etiquetaEstado(status),
      total,
      items: items.map(({ id, qty, unit, subtotal }) => ({ id, qty, unit, subtotal })),
      pago: body.metodo === "wompi" ? { proveedor: "wompi", checkoutUrl: checkoutUrl(reference, total * 100) } : null
    });
  })
);

/** Seguimiento: exige referencia + celular (ambos). Respuesta idéntica si no existe o no coincide → no permite adivinar pedidos. */
const trackSchema = z.object({ reference: z.string().trim().toUpperCase().regex(/^LP-[2-9A-HJ-NP-Z]{10}$/, "referencia inválida"), telefono: celularCO }).strict();

ordersRouter.post(
  "/track",
  limiter("seguimiento", 15, 10),
  asyncH(async (req, res) => {
    const { reference, telefono } = parseBody(trackSchema, req.body);
    const { rows } = await q<{ status: string; total: number; created_at: Date; telefono_bidx: string | null }>(
      "SELECT status, total, created_at, telefono_bidx FROM orders WHERE reference = $1",
      [reference]
    );
    const o = rows[0];
    const ok = !!o && !!o.telefono_bidx && safeEqual(o.telefono_bidx, blindIndex(telefono, "telefono"));
    void audit("order.track", req, { encontrado: ok });
    if (!ok) throw new HttpError(404, "NO_ENCONTRADO", "No encontramos un pedido con esa referencia y ese celular.");
    res.json({ reference, estado: o!.status, etiqueta: etiquetaEstado(o!.status), paso: pasoEstado(o!.status), total: o!.total, creado: o!.created_at });
  })
);
