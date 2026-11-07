/* Logs estructurados (JSON). Los datos personales y secretos se REDACTAN antes de escribirse. */
import { pino } from "pino";
import { env } from "../config/env.js";
export const REDACT_PATHS = [
    "req.headers.cookie",
    "req.headers.authorization",
    "req.headers[\"x-csrf-token\"]",
    "res.headers[\"set-cookie\"]",
    "*.password", "*.clave", "*.contrasena",
    "*.telefono", "*.celular", "*.email", "*.correo", "*.direccion", "*.nombre", "*.documento",
    "*.token", "*.secret", "*.signature"
];
export const logger = pino({
    level: env.LOG_LEVEL,
    redact: { paths: REDACT_PATHS, censor: "[REDACTADO]" },
    base: { svc: "lp-api" },
    timestamp: pino.stdTimeFunctions.isoTime
});
