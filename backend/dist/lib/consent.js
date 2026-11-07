import { hashIp, sha256Hex } from "../security/crypto.js";
/** Versión vigente de la Política de Tratamiento de Datos. Si cambias el texto, sube la versión. */
export const POLITICA_VERSION = "2026-10";
export const FINALIDADES = {
    pedido: "Gestionar el pedido, el pago, la entrega y la atención posventa.",
    mayorista: "Evaluar la solicitud de cuenta mayorista y contactar al solicitante.",
    habeas: "Atender la solicitud del titular sobre sus datos personales."
};
export async function registrarConsentimiento(c, req, finalidad, subjectBidx) {
    const texto = `${POLITICA_VERSION}|${FINALIDADES[finalidad]}`;
    const { rows } = await c.query("INSERT INTO consents(finalidad, version_politica, texto_hash, subject_bidx, ip_hash, ua_hash) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id", [finalidad, POLITICA_VERSION, sha256Hex(texto), subjectBidx, hashIp(req.ip), sha256Hex(req.get("user-agent") || "").slice(0, 32)]);
    return rows[0].id;
}
