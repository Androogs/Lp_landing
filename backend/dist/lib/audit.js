import { q } from "../db/pool.js";
import { hashIp } from "../security/crypto.js";
import { logger } from "./logger.js";
/** Registra un evento de seguridad (sin datos personales: solo ids, hash de IP y metadatos técnicos) */
export async function audit(event, req, meta = {}, actorId) {
    try {
        await q("INSERT INTO audit_log(event, actor_id, ip_hash, request_id, meta) VALUES ($1,$2,$3,$4,$5)", [
            event,
            actorId ?? req?.session?.userId ?? null,
            hashIp(req?.ip),
            req?.id ?? null,
            JSON.stringify(meta)
        ]);
    }
    catch (e) {
        logger.error({ err: e, event }, "no se pudo escribir auditoría");
    }
}
