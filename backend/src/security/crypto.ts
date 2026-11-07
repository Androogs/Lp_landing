/* ============================================================
   Criptografía de datos personales
   - AES-256-GCM (cifrado autenticado) con clave versionada → permite rotar claves
   - Índice ciego HMAC-SHA256 → buscar por teléfono sin guardar el número en claro
   - Tokens aleatorios y comparación en tiempo constante
   ============================================================ */
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "../config/env.js";

type KeyRing = Map<string, Buffer>;

export function parseKeyRing(spec: string): KeyRing {
  const ring: KeyRing = new Map();
  for (const part of spec.split(",").map((s) => s.trim()).filter(Boolean)) {
    const [id = "", b64 = ""] = part.split(":");
    const key = Buffer.from(b64, "base64");
    if (!/^v\d+$/.test(id) || key.length !== 32) throw new Error(`Clave de cifrado inválida: ${id}`);
    ring.set(id, key);
  }
  return ring;
}

const ring = parseKeyRing(env.DATA_ENCRYPTION_KEYS);
if (!ring.has(env.DATA_ENCRYPTION_ACTIVE)) throw new Error("DATA_ENCRYPTION_ACTIVE no existe en DATA_ENCRYPTION_KEYS");
const blindKey = Buffer.from(env.BLIND_INDEX_KEY, "base64");

/**
 * Cifra un texto. Formato: "v1.<iv>.<tag>.<datos>" (base64url).
 * `aad` (dato adicional autenticado) ata el valor a su contexto (p. ej. "orders.telefono"):
 * si alguien lo copia a otra columna o lo altera, el descifrado falla.
 */
export function encrypt(plain: string, aad: string): string {
  const kid = env.DATA_ENCRYPTION_ACTIVE;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", ring.get(kid)!, iv);
  cipher.setAAD(Buffer.from(aad));
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [kid, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decrypt(blob: string, aad: string): string {
  const [kid = "", iv, tag, data] = blob.split(".");
  const key = ring.get(kid);
  if (!key || !iv || !tag || data === undefined) throw new Error("Dato cifrado inválido o clave desconocida");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}

export const encryptOpt = (v: string | null | undefined, aad: string) => (v ? encrypt(v, aad) : null);
export const decryptOpt = (v: string | null | undefined, aad: string) => (v ? decrypt(v, aad) : null);

/** Versión de clave con la que está cifrado un valor (para rotación) */
export const keyIdOf = (blob: string) => blob.split(".")[0];

/** Índice ciego determinístico (HMAC) para búsquedas exactas sobre datos cifrados */
export function blindIndex(value: string, context: string): string {
  return createHmac("sha256", blindKey).update(context + "|" + value).digest("hex");
}

export const sha256Hex = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

/** Comparación en tiempo constante (evita ataques de temporización al comparar firmas) */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb) && a.length === b.length;
}

/** Seudonimiza una IP (Ley 1581: minimización). Sirve para auditoría sin guardar la IP en claro. */
export const hashIp = (ip: string | undefined) => (ip ? blindIndex(ip, "ip").slice(0, 32) : null);

/** Normaliza un celular colombiano a 10 dígitos (3XXXXXXXXX) */
export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("57")) d = d.slice(2);
  return d;
}
