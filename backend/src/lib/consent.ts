/* Prueba de autorización de tratamiento de datos (Ley 1581 de 2012, art. 9; Decreto 1377 de 2013, art. 7) */
import type pg from "pg";
import type { Request } from "express";
import { hashIp, sha256Hex } from "../security/crypto.js";

/** Versión vigente de la Política de Tratamiento de Datos. Si cambias el texto, sube la versión. */
export const POLITICA_VERSION = "2026-10";

export const FINALIDADES = {
  pedido: "Gestionar el pedido, el pago, la entrega y la atención posventa.",
  mayorista: "Evaluar la solicitud de cuenta mayorista y contactar al solicitante.",
  habeas: "Atender la solicitud del titular sobre sus datos personales."
} as const;

export async function registrarConsentimiento(
  c: pg.PoolClient,
  req: Request,
  finalidad: keyof typeof FINALIDADES,
  subjectBidx: string | null
): Promise<string> {
  const texto = `${POLITICA_VERSION}|${FINALIDADES[finalidad]}`;
  const { rows } = await c.query<{ id: string }>(
    "INSERT INTO consents(finalidad, version_politica, texto_hash, subject_bidx, ip_hash, ua_hash) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
    [finalidad, POLITICA_VERSION, sha256Hex(texto), subjectBidx, hashIp(req.ip), sha256Hex(req.get("user-agent") || "").slice(0, 32)]
  );
  return rows[0]!.id;
}
