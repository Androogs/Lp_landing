import pg from "pg";
import { env } from "../config/env.js";
const ssl = env.DATABASE_SSL === "disable"
    ? false
    : { rejectUnauthorized: env.DATABASE_SSL === "verify-full", ...(env.DATABASE_CA_CERT ? { ca: env.DATABASE_CA_CERT } : {}) };
/** Pool de conexiones. Todas las consultas usan parámetros ($1, $2…): nunca se concatena SQL con datos del usuario. */
export const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    ssl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
    application_name: "lp-api"
});
export const q = (text, params = []) => pool.query(text, params);
/** Ejecuta una función dentro de una transacción (BEGIN/COMMIT/ROLLBACK) */
export async function tx(fn) {
    const c = await pool.connect();
    try {
        await c.query("BEGIN");
        const r = await fn(c);
        await c.query("COMMIT");
        return r;
    }
    catch (e) {
        await c.query("ROLLBACK").catch(() => undefined);
        throw e;
    }
    finally {
        c.release();
    }
}
