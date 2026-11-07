/* Contraseñas con Argon2id (recomendación OWASP) + pepper guardado fuera de la base de datos */
import { hash, verify } from "@node-rs/argon2";
import { env } from "../config/env.js";
const secret = Buffer.from(env.PASSWORD_PEPPER, "base64");
const OPTS = { algorithm: 2 /* Algorithm.Argon2id */, memoryCost: 19456, timeCost: 2, parallelism: 1, secret };
export const hashPassword = (plain) => hash(plain, OPTS);
export async function verifyPassword(stored, plain) {
    try {
        return await verify(stored, plain, { secret });
    }
    catch {
        return false;
    }
}
/** Hash ficticio: se verifica contra él cuando el usuario no existe, para que el tiempo de respuesta no revele qué usuarios existen */
let dummy = null;
export async function dummyVerify(plain) {
    dummy ??= await hashPassword("dummy-password-para-tiempo-constante");
    await verifyPassword(dummy, plain);
}
const COMUNES = new Set(["123456789012", "contraseña123", "password1234", "licorespalmira", "palmira2026", "qwertyuiop12", "licorespalmira1"]);
/** Política: 12–128 caracteres, al menos 3 de 4 tipos, no común, no contiene el usuario */
export function passwordProblems(p, usuario = "") {
    const out = [];
    if (p.length < 12)
        out.push("mínimo 12 caracteres");
    if (p.length > 128)
        out.push("máximo 128 caracteres");
    const tipos = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(p)).length;
    if (tipos < 3)
        out.push("combina al menos 3 de: minúsculas, mayúsculas, números, símbolos");
    if (COMUNES.has(p.toLowerCase()))
        out.push("contraseña demasiado común");
    if (usuario && p.toLowerCase().includes(usuario.toLowerCase()))
        out.push("no debe contener el usuario");
    return out;
}
