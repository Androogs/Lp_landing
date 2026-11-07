/* Solicitudes de cuenta mayorista (datos cifrados) */
import { Router } from "express";
import { z } from "zod";
import { tx } from "../../db/pool.js";
import { audit } from "../../lib/audit.js";
import { registrarConsentimiento } from "../../lib/consent.js";
import { asyncH, celularCO, parseBody, texto } from "../../lib/http.js";
import { limiter } from "../../middleware/security.js";
import { blindIndex, encrypt } from "../../security/crypto.js";

export const leadsRouter = Router();

export const TIPOS_NEGOCIO = ["Tienda / estanco", "Bar o discoteca", "Restaurante", "Hotel", "Eventos", "Otro"] as const;

const schema = z
  .object({
    negocio: texto(2, 100),
    tipo: z.enum(TIPOS_NEGOCIO),
    nombre: texto(3, 80),
    telefono: celularCO,
    ciudad: texto(2, 60),
    autorizacionDatos: z.literal(true, { error: "debes autorizar el tratamiento de datos" })
  })
  .strict();

leadsRouter.post(
  "/",
  limiter("solicitud-mayorista", 60, 5),
  asyncH(async (req, res) => {
    const b = parseBody(schema, req.body);
    const bidx = blindIndex(b.telefono, "telefono");
    const id = await tx(async (c) => {
      const consentId = await registrarConsentimiento(c, req, "mayorista", bidx);
      const { rows } = await c.query<{ id: string }>(
        "INSERT INTO leads_mayoristas(negocio_enc, tipo, nombre_enc, telefono_enc, telefono_bidx, ciudad, consent_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id",
        [encrypt(b.negocio, "leads.negocio"), b.tipo, encrypt(b.nombre, "leads.nombre"), encrypt(b.telefono, "leads.telefono"), bidx, b.ciudad, consentId]
      );
      return rows[0]!.id;
    });
    void audit("lead.created", req, { id });
    res.status(201).json({ ok: true, mensaje: "Recibimos tu solicitud. Un asesor te contactará en el día hábil." });
  })
);
