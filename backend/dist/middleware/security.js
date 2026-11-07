/* ============================================================
   Middlewares de seguridad del API
   ============================================================ */
import { createHmac, randomUUID } from "node:crypto";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { allowedOrigins, env, isProd } from "../config/env.js";
import { q } from "../db/pool.js";
import { audit } from "../lib/audit.js";
import { HttpError } from "../lib/http.js";
import { logger } from "../lib/logger.js";
import { decrypt, randomToken, safeEqual, sha256Hex } from "../security/crypto.js";
/* ---------- Nombres de cookie: prefijo __Host- en producción (exige Secure, Path=/ y sin Domain) ---------- */
export const COOKIE_SESSION = isProd ? "__Host-lp_sid" : "lp_sid";
export const COOKIE_CSRF = isProd ? "__Host-lp_csrf" : "lp_csrf";
export const cookieBase = { httpOnly: true, secure: isProd, sameSite: "strict", path: "/" };
/* ---------- Encabezados (el API solo responde JSON: CSP mínima) ---------- */
export const securityHeaders = helmet({
    contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] } },
    crossOriginResourcePolicy: { policy: "same-origin" },
    hsts: isProd ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }
});
export function requestId(req, res, next) {
    const incoming = req.get("x-request-id");
    const id = incoming && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
    req.id = id;
    res.setHeader("X-Request-Id", id);
    next();
}
/** Ninguna respuesta del API se guarda en caché (pueden contener datos personales) */
export function noStore(_req, res, next) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Pragma", "no-cache");
    next();
}
/* ---------- Verificación de origen (defensa CSRF #1) ---------- */
const UNSAFE = new Set(["POST", "PUT", "PATCH", "DELETE"]);
export function originCheck(req, _res, next) {
    if (!UNSAFE.has(req.method))
        return next();
    const origin = req.get("origin") || (req.get("referer") ? safeOrigin(req.get("referer")) : null);
    if (!origin || !allowedOrigins.has(origin)) {
        void audit("origin.rejected", req, { origin: origin ?? "ninguno", path: req.path });
        return next(new HttpError(403, "ORIGEN", "Solicitud no permitida."));
    }
    next();
}
function safeOrigin(u) {
    try {
        return new URL(u).origin;
    }
    catch {
        return null;
    }
}
/* ---------- Token CSRF firmado de doble envío (defensa CSRF #2) ---------- */
const csrfKey = Buffer.from(env.CSRF_SECRET, "base64");
const sign = (nonce) => createHmac("sha256", csrfKey).update(nonce).digest("base64url");
/** Emite un token CSRF nuevo: lo guarda en cookie HttpOnly y lo devuelve para enviarlo en el encabezado X-CSRF-Token */
export function newCsrfToken(res) {
    const nonce = randomToken(24);
    const token = nonce + "." + sign(nonce);
    res.cookie(COOKIE_CSRF, token, { ...cookieBase, maxAge: 1000 * 60 * 60 * 8 });
    return token;
}
export function issueCsrf(_req, res) {
    res.json({ csrfToken: newCsrfToken(res) });
}
export function csrfProtect(req, _res, next) {
    if (!UNSAFE.has(req.method))
        return next();
    const header = req.get("x-csrf-token") || "";
    const cookie = req.cookies?.[COOKIE_CSRF] || "";
    const [nonce = "", mac = ""] = header.split(".");
    const ok = !!header && safeEqual(header, cookie) && !!nonce && safeEqual(mac, sign(nonce));
    if (!ok) {
        void audit("csrf.rejected", req, { path: req.path });
        return next(new HttpError(403, "CSRF", "La sesión del formulario expiró. Recarga la página e inténtalo de nuevo."));
    }
    next();
}
/* ---------- Sesión de servidor ---------- */
export async function loadSession(req, res, next) {
    const raw = req.cookies?.[COOKIE_SESSION];
    if (!raw || raw.length > 128)
        return next();
    try {
        const idHash = sha256Hex(raw);
        const { rows } = await q(`SELECT s.user_id, u.rol, u.nombre_enc, u.usuario, s.last_seen_at, s.expires_at, u.disabled
         FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id_hash = $1`, [idHash]);
        const s = rows[0];
        const now = Date.now();
        const idleMs = env.SESSION_IDLE_MINUTES * 60_000;
        if (!s || s.disabled || s.expires_at.getTime() < now || now - s.last_seen_at.getTime() > idleMs) {
            if (s) {
                await q("DELETE FROM sessions WHERE id_hash = $1", [idHash]);
                void audit("auth.session.expired", req, {}, s.user_id);
            }
            res.clearCookie(COOKIE_SESSION, cookieBase);
            return next();
        }
        if (now - s.last_seen_at.getTime() > 60_000)
            await q("UPDATE sessions SET last_seen_at = now() WHERE id_hash = $1", [idHash]);
        req.session = { idHash, userId: s.user_id, rol: s.rol, usuario: s.usuario, nombre: decrypt(s.nombre_enc, "users.nombre") };
        next();
    }
    catch (e) {
        next(e);
    }
}
export const requireAuth = (...roles) => (req, _res, next) => {
    if (!req.session)
        return next(new HttpError(401, "NO_AUTENTICADO", "Inicia sesión para continuar."));
    if (roles.length && !roles.includes(req.session.rol))
        return next(new HttpError(403, "PROHIBIDO", "No tienes permiso para esta acción."));
    next();
};
/* ---------- Límites de peticiones (anti fuerza bruta / abuso) ---------- */
export function limiter(name, windowMin, limit, extra = {}) {
    return rateLimit({
        windowMs: windowMin * 60_000,
        limit,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        skip: () => env.NODE_ENV === "test" && process.env.RATE_LIMIT_IN_TESTS !== "1",
        handler: (req, res) => {
            void audit("rate.limited", req, { limiter: name, path: req.path });
            res.status(429).json({ error: { code: "DEMASIADAS_SOLICITUDES", message: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo." } });
        },
        ...extra
    });
}
/* ---------- Errores: nunca se filtran detalles internos ---------- */
export function notFound(_req, _res, next) {
    next(new HttpError(404, "NO_ENCONTRADO", "Recurso no encontrado."));
}
export function errorHandler(err, req, res, _next) {
    const rid = req.id;
    if (err instanceof HttpError) {
        return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details }, requestId: rid });
    }
    const e = err;
    if (e?.type === "entity.too.large")
        return res.status(413).json({ error: { code: "MUY_GRANDE", message: "La solicitud es demasiado grande." }, requestId: rid });
    if (e?.type === "entity.parse.failed")
        return res.status(400).json({ error: { code: "JSON", message: "Formato inválido." }, requestId: rid });
    logger.error({ err, requestId: rid, path: req.path }, "error no controlado");
    res.status(500).json({ error: { code: "INTERNO", message: "Ocurrió un error. Inténtalo de nuevo en unos minutos." }, requestId: rid });
}
