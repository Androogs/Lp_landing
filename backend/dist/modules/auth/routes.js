/* Autenticación de clientes mayoristas y administradores */
import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { q, tx } from "../../db/pool.js";
import { audit } from "../../lib/audit.js";
import { asyncH, HttpError, parseBody } from "../../lib/http.js";
import { COOKIE_SESSION, cookieBase, limiter, newCsrfToken } from "../../middleware/security.js";
import { decrypt, hashIp, randomToken, sha256Hex } from "../../security/crypto.js";
import { dummyVerify, verifyPassword } from "../../security/password.js";
import { verifyTotp } from "../../security/totp.js";
export const authRouter = Router();
const MAX_FALLOS = 5;
const MAX_SESIONES = 5;
const GENERICO = "Usuario, contraseña o código incorrectos, o cuenta bloqueada temporalmente.";
const loginSchema = z
    .object({
    usuario: z.string().trim().toLowerCase().min(3).max(80),
    clave: z.string().min(1).max(128),
    codigo: z.string().regex(/^\d{6}$/).optional()
})
    .strict();
/** Bloqueo progresivo: 15 min tras 5 fallos, se duplica con cada fallo adicional (máx. 24 h) */
const bloqueoMin = (fallos) => Math.min(15 * 2 ** Math.max(0, fallos - MAX_FALLOS), 24 * 60);
authRouter.post("/login", limiter("login-ip", 15, 10), asyncH(async (req, res) => {
    const { usuario, clave, codigo } = parseBody(loginSchema, req.body);
    const { rows } = await q("SELECT id, password_hash, rol, nombre_enc, disabled, failed_attempts, locked_until, totp_secret_enc FROM users WHERE usuario = $1", [usuario]);
    const u = rows[0];
    if (!u) {
        await dummyVerify(clave); // mismo tiempo de respuesta exista o no el usuario
        void audit("auth.login.fail", req, { motivo: "usuario_inexistente" });
        throw new HttpError(401, "CREDENCIALES", GENERICO);
    }
    if (u.disabled || (u.locked_until && u.locked_until.getTime() > Date.now())) {
        await dummyVerify(clave);
        void audit("auth.login.locked", req, {}, u.id);
        throw new HttpError(401, "CREDENCIALES", GENERICO);
    }
    let ok = await verifyPassword(u.password_hash, clave);
    if (ok && u.rol === "admin") {
        if (!codigo)
            throw new HttpError(401, "MFA_REQUERIDO", "Ingresa el código de 6 dígitos de tu app de autenticación.");
        ok = verifyTotp(decrypt(u.totp_secret_enc, "users.totp"), codigo);
    }
    if (!ok) {
        const fallos = u.failed_attempts + 1;
        const lock = fallos >= MAX_FALLOS ? new Date(Date.now() + bloqueoMin(fallos) * 60_000) : null;
        await q("UPDATE users SET failed_attempts = $2, locked_until = COALESCE($3, locked_until) WHERE id = $1", [u.id, fallos, lock]);
        void audit(lock ? "auth.login.locked" : "auth.login.fail", req, { fallos }, u.id);
        throw new HttpError(401, "CREDENCIALES", GENERICO);
    }
    // Sesión nueva (evita fijación de sesión): se elimina la anterior y se emite un token aleatorio de 256 bits
    const token = randomToken(32);
    const prev = req.cookies?.[COOKIE_SESSION];
    await tx(async (c) => {
        if (prev)
            await c.query("DELETE FROM sessions WHERE id_hash = $1", [sha256Hex(prev)]);
        await c.query("UPDATE users SET failed_attempts = 0, locked_until = NULL, last_login_at = now() WHERE id = $1", [u.id]);
        await c.query("INSERT INTO sessions(id_hash, user_id, expires_at, ip_hash, ua_hash) VALUES ($1, $2, now() + make_interval(hours => $3), $4, $5)", [sha256Hex(token), u.id, env.SESSION_ABSOLUTE_HOURS, hashIp(req.ip), sha256Hex(req.get("user-agent") || "").slice(0, 32)]);
        // máximo de sesiones simultáneas por usuario
        await c.query("DELETE FROM sessions WHERE user_id = $1 AND id_hash NOT IN (SELECT id_hash FROM sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2)", [u.id, MAX_SESIONES]);
    });
    res.cookie(COOKIE_SESSION, token, { ...cookieBase, maxAge: env.SESSION_ABSOLUTE_HOURS * 3_600_000 });
    void audit("auth.login.ok", req, {}, u.id);
    // token CSRF nuevo para el nuevo contexto de sesión
    res.json({ user: { usuario, nombre: decrypt(u.nombre_enc, "users.nombre"), rol: u.rol }, csrfToken: newCsrfToken(res) });
}));
authRouter.post("/logout", asyncH(async (req, res) => {
    if (req.session) {
        await q("DELETE FROM sessions WHERE id_hash = $1", [req.session.idHash]);
        void audit("auth.logout", req);
    }
    res.clearCookie(COOKIE_SESSION, cookieBase);
    res.json({ ok: true });
}));
/** Cierra todas las sesiones del usuario (p. ej. si cree que alguien más entró) */
authRouter.post("/logout-all", asyncH(async (req, res) => {
    if (!req.session)
        throw new HttpError(401, "NO_AUTENTICADO", "Inicia sesión para continuar.");
    await q("DELETE FROM sessions WHERE user_id = $1", [req.session.userId]);
    void audit("auth.logout", req, { todas: true });
    res.clearCookie(COOKIE_SESSION, cookieBase);
    res.json({ ok: true });
}));
authRouter.get("/me", (req, res) => {
    if (!req.session)
        return res.json({ user: null });
    const { usuario, nombre, rol } = req.session;
    res.json({ user: { usuario, nombre, rol } });
});
