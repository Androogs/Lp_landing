import { env } from "./config/env.js";
import { createApp } from "./app.js";
import { pool } from "./db/pool.js";
import { logger } from "./lib/logger.js";
const app = createApp();
const server = app.listen(env.PORT, () => logger.info({ port: env.PORT, env: env.NODE_ENV }, "API de Licores Palmira lista"));
server.headersTimeout = 15_000;
server.requestTimeout = 20_000;
server.keepAliveTimeout = 5_000;
// Limpieza periódica de sesiones vencidas
const limpieza = setInterval(() => void pool.query("DELETE FROM sessions WHERE expires_at < now()").catch(() => undefined), 15 * 60_000);
function apagar(señal) {
    logger.info({ señal }, "apagando…");
    clearInterval(limpieza);
    server.close(() => void pool.end().then(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGTERM", () => apagar("SIGTERM"));
process.on("SIGINT", () => apagar("SIGINT"));
process.on("unhandledRejection", (e) => logger.error({ err: e }, "promesa rechazada sin manejar"));
