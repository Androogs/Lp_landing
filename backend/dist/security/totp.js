/* TOTP (RFC 6238) para el segundo factor de administradores. Compatible con Google Authenticator, Authy, Microsoft Authenticator. */
import { createHmac, randomBytes } from "node:crypto";
import { safeEqual } from "./crypto.js";
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export function base32Encode(buf) {
    let bits = 0, value = 0, out = "";
    for (const byte of buf) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            out += B32[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0)
        out += B32[(value << (5 - bits)) & 31];
    return out;
}
export function base32Decode(s) {
    const clean = s.replace(/=+$/, "").toUpperCase();
    let bits = 0, value = 0;
    const out = [];
    for (const ch of clean) {
        const i = B32.indexOf(ch);
        if (i < 0)
            throw new Error("base32 inválido");
        value = (value << 5) | i;
        bits += 5;
        if (bits >= 8) {
            out.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return Buffer.from(out);
}
export const newTotpSecret = () => base32Encode(randomBytes(20));
export function totpAt(secret, counter) {
    const msg = Buffer.alloc(8);
    msg.writeBigUInt64BE(BigInt(counter));
    const h = createHmac("sha1", base32Decode(secret)).update(msg).digest();
    const off = h[h.length - 1] & 0xf;
    const code = ((h.readUInt32BE(off) & 0x7fffffff) % 1_000_000).toString().padStart(6, "0");
    return code;
}
/** Verifica un código de 6 dígitos con ±1 paso de 30 s de tolerancia por desfase de reloj */
export function verifyTotp(secret, code, now = Date.now()) {
    if (!/^\d{6}$/.test(code))
        return false;
    const c = Math.floor(now / 30_000);
    let ok = false;
    for (const d of [-1, 0, 1])
        ok = safeEqual(totpAt(secret, c + d), code) || ok;
    return ok;
}
export const otpauthUri = (secret, usuario) => `otpauth://totp/${encodeURIComponent("Licores Palmira:" + usuario)}?secret=${secret}&issuer=${encodeURIComponent("Licores Palmira")}&algorithm=SHA1&digits=6&period=30`;
