/* Derechos del titular (habeas data) · Ley 1581 de 2012 arts. 14 y 15:
   consultas: 10 días hábiles · reclamos (actualización, rectificación, supresión, revocatoria): 15 días hábiles. */
import { randomBytes } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import { tx } from "../../db/pool.js";
import { audit } from "../../lib/audit.js";
import { registrarConsentimiento } from "../../lib/consent.js";
import { asyncH, celularCO, HttpError, parseBody, texto } from "../../lib/http.js";
import { limiter } from "../../middleware/security.js";
import { blindIndex, encrypt, encryptOpt } from "../../security/crypto.js";
export const privacyRouter = Router();
/** Suma días hábiles (lunes a viernes). Nota: no descuenta festivos colombianos; el área responsable debe validarlo. */
export function sumarDiasHabiles(desde, dias) {
    const d = new Date(desde);
    let n = 0;
    while (n < dias) {
        d.setDate(d.getDate() + 1);
        if (d.getDay() !== 0 && d.getDay() !== 6)
            n++;
    }
    return d;
}
const schema = z
    .object({
    tipo: z.enum(["consulta", "actualizacion", "rectificacion", "supresion", "revocatoria"]),
    nombre: texto(3, 80),
    telefono: celularCO.optional(),
    email: z.string().trim().toLowerCase().email().max(120).optional(),
    detalle: texto(10, 1000),
    autorizacionDatos: z.literal(true, { error: "debes autorizar el tratamiento de datos para responder tu solicitud" })
})
    .strict();
privacyRouter.post("/", limiter("habeas-data", 60, 5), asyncH(async (req, res) => {
    const b = parseBody(schema, req.body);
    if (!b.telefono && !b.email)
        throw new HttpError(400, "CONTACTO", "Indica un celular o un correo para responderte.");
    const bidx = b.telefono ? blindIndex(b.telefono, "telefono") : blindIndex(b.email, "email");
    const hoy = new Date();
    const radicado = "HD-" + hoy.toISOString().slice(0, 10).replace(/-/g, "") + "-" + randomBytes(3).toString("hex").toUpperCase();
    const due = sumarDiasHabiles(hoy, b.tipo === "consulta" ? 10 : 15);
    await tx(async (c) => {
        await registrarConsentimiento(c, req, "habeas", bidx);
        await c.query("INSERT INTO privacy_requests(radicado, tipo, nombre_enc, telefono_enc, email_enc, detalle_enc, subject_bidx, due_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [radicado, b.tipo, encrypt(b.nombre, "privacy.nombre"), encryptOpt(b.telefono, "privacy.telefono"), encryptOpt(b.email, "privacy.email"), encrypt(b.detalle, "privacy.detalle"), bidx, due]);
    });
    void audit("privacy.request", req, { radicado, tipo: b.tipo });
    res.status(201).json({ radicado, plazo: due.toISOString().slice(0, 10), mensaje: "Radicamos tu solicitud. Te responderemos dentro del plazo legal." });
}));
