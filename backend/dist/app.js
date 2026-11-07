/* ============================================================
   Licores Palmira · API
   Orden de las capas de seguridad (de afuera hacia adentro):
   Nginx (TLS, cabeceras, límites) → id de petición → cabeceras → webhook firmado →
   JSON acotado → límite global → sesión → origen + CSRF → validación zod → lógica → SQL parametrizado
   ============================================================ */
import cookieParser from "cookie-parser";
import express from "express";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { q } from "./db/pool.js";
import { HttpError } from "./lib/http.js";
import { logger } from "./lib/logger.js";
import { csrfProtect, errorHandler, issueCsrf, limiter, loadSession, noStore, notFound, originCheck, requestId, securityHeaders } from "./middleware/security.js";
import { adminRouter } from "./modules/admin/routes.js";
import { authRouter } from "./modules/auth/routes.js";
import { leadsRouter } from "./modules/leads/routes.js";
import { ordersRouter } from "./modules/orders/routes.js";
import { paymentsRouter } from "./modules/payments/routes.js";
import { privacyRouter } from "./modules/privacy/routes.js";
export function createApp(opts = {}) {
    const app = express();
    app.disable("x-powered-by");
    app.set("trust proxy", env.TRUST_PROXY);
    app.use(requestId);
    app.use(pinoHttp({
        logger,
        genReqId: (req) => req.id,
        // solo metadatos técnicos: nunca cuerpos, cookies ni encabezados sensibles
        serializers: {
            req: (r) => ({ id: r.id, method: r.method, url: r.url.split("?")[0] }),
            res: (r) => ({ statusCode: r.statusCode })
        },
        autoLogging: { ignore: (req) => req.url === "/api/health" }
    }));
    app.use(securityHeaders);
    app.use("/api", noStore);
    const pagos = paymentsRouter(opts.fetchTransaction);
    // Webhook de Wompi: sin cookies ni CSRF (lo autentica su firma). Se guarda el cuerpo crudo para verificarla.
    app.post("/api/payments/wompi/webhook", limiter("webhook", 1, 120), express.json({ limit: "64kb", verify: (req, _res, buf) => void (req.rawBody = Buffer.from(buf)) }), pagos.webhook);
    // Solo se aceptan cuerpos JSON pequeños (bloquea también envíos de formularios de otros sitios)
    app.use("/api", (req, _res, next) => {
        if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !req.is("application/json") && req.headers["content-length"] !== "0") {
            return next(new HttpError(415, "TIPO", "Formato no soportado."));
        }
        next();
    });
    app.use(express.json({ limit: "32kb", strict: true }));
    app.use(cookieParser());
    app.use("/api", limiter("global", 15, 300));
    app.get("/api/health", async (_req, res) => {
        try {
            await q("SELECT 1");
            res.json({ ok: true });
        }
        catch {
            res.status(503).json({ ok: false });
        }
    });
    app.use("/api", loadSession);
    app.get("/api/csrf", issueCsrf);
    app.use("/api", originCheck, csrfProtect);
    app.use("/api/auth", authRouter);
    app.use("/api/orders", ordersRouter);
    app.use("/api/payments", pagos.router);
    app.use("/api/mayoristas/solicitudes", leadsRouter);
    app.use("/api/privacidad/solicitudes", privacyRouter);
    app.use("/api/admin", adminRouter);
    app.use(notFound);
    app.use(errorHandler);
    return app;
}
