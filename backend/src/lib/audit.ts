import type { Request } from "express";
import { q } from "../db/pool.js";
import { hashIp } from "../security/crypto.js";
import { logger } from "./logger.js";

export type AuditEvent =
  | "auth.login.ok" | "auth.login.fail" | "auth.login.locked" | "auth.logout" | "auth.session.expired"
  | "order.created" | "order.paid" | "order.payment_rejected" | "order.track"
  | "payment.event.invalid_signature" | "payment.event.mismatch" | "payment.event.stale" | "payment.event.processed"
  | "csrf.rejected" | "origin.rejected" | "rate.limited"
  | "lead.created" | "privacy.request" | "retention.run" | "keys.rotated"
  | "admin.pii.read" | "admin.order.status" | "admin.privacy.update";

/** Registra un evento de seguridad (sin datos personales: solo ids, hash de IP y metadatos técnicos) */
export async function audit(event: AuditEvent, req: Request | null, meta: Record<string, unknown> = {}, actorId?: string | null) {
  try {
    await q("INSERT INTO audit_log(event, actor_id, ip_hash, request_id, meta) VALUES ($1,$2,$3,$4,$5)", [
      event,
      actorId ?? req?.session?.userId ?? null,
      hashIp(req?.ip),
      (req?.id as string | undefined) ?? null,
      JSON.stringify(meta)
    ]);
  } catch (e) {
    logger.error({ err: e, event }, "no se pudo escribir auditoría");
  }
}
