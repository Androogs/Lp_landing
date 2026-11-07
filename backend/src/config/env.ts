/* Configuración validada al arrancar. Si falta un secreto o es débil, el servidor NO arranca (fail-fast). */
import { z } from "zod";

const b64Key = (bytes: number) =>
  z.string().refine((v) => Buffer.from(v, "base64").length === bytes, `debe ser una clave base64 de ${bytes} bytes (usa npm run secrets:generate)`);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  /** Número de proxies de confianza delante del API (Nginx = 1). Necesario para IP real y cookies Secure. */
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  /** URL pública del sitio (origen permitido para Origin/Referer y redirect de pagos) */
  PUBLIC_SITE_URL: z.string().url(),
  /** Orígenes extra permitidos (separados por coma), p. ej. http://127.0.0.1:5173 en desarrollo */
  EXTRA_ALLOWED_ORIGINS: z.string().default(""),

  DATABASE_URL: z.string().min(1),
  DATABASE_SSL: z.enum(["disable", "require", "verify-full"]).default("disable"),
  DATABASE_CA_CERT: z.string().optional(),

  /** Claves de cifrado de datos personales, con versión: "v1:<base64 32B>,v2:<base64 32B>" */
  DATA_ENCRYPTION_KEYS: z.string().min(1),
  /** Versión activa para cifrar (las demás solo se usan para descifrar datos antiguos) */
  DATA_ENCRYPTION_ACTIVE: z.string().regex(/^v\d+$/),
  /** Clave HMAC para índices ciegos (buscar por teléfono sin guardarlo en claro) */
  BLIND_INDEX_KEY: b64Key(32),
  /** Pepper de contraseñas (se suma a Argon2id; nunca se guarda en la base de datos) */
  PASSWORD_PEPPER: b64Key(32),
  /** Firma de tokens CSRF */
  CSRF_SECRET: b64Key(32),

  SESSION_IDLE_MINUTES: z.coerce.number().int().min(5).max(240).default(30),
  SESSION_ABSOLUTE_HOURS: z.coerce.number().int().min(1).max(72).default(8),

  WOMPI_ENV: z.enum(["sandbox", "production"]).default("sandbox"),
  WOMPI_PUBLIC_KEY: z.string().regex(/^pub_(test|prod)_/, "llave pública de Wompi inválida"),
  WOMPI_INTEGRITY_SECRET: z.string().min(16),
  WOMPI_EVENTS_SECRET: z.string().min(16),
  /** Doble verificación: consultar la transacción en la API de Wompi antes de marcar un pedido como pagado */
  WOMPI_VERIFY_WITH_API: z.enum(["true", "false"]).default("true").transform((v) => v === "true"),
  /** Tolerancia de antigüedad de eventos (anti-replay). Wompi reintenta eventos, por eso es amplia. */
  WOMPI_EVENT_MAX_AGE_HOURS: z.coerce.number().int().min(1).max(168).default(72),

  /** Meses que se conservan los datos personales de pedidos antes de anonimizarlos */
  RETENTION_MONTHS: z.coerce.number().int().min(1).max(120).default(24)
});

export type Env = z.infer<typeof schema>;

function load(): Env {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error("Configuración inválida, el servidor no arranca:\n" + msg);
  }
  const e = parsed.data;
  if (e.NODE_ENV === "production") {
    if (!e.PUBLIC_SITE_URL.startsWith("https://")) throw new Error("PUBLIC_SITE_URL debe usar https en producción");
    if (e.WOMPI_ENV === "production" && !e.WOMPI_PUBLIC_KEY.startsWith("pub_prod_")) throw new Error("WOMPI_PUBLIC_KEY no es de producción");
    if (!e.WOMPI_VERIFY_WITH_API) throw new Error("WOMPI_VERIFY_WITH_API debe estar activo en producción");
    if (e.EXTRA_ALLOWED_ORIGINS) throw new Error("EXTRA_ALLOWED_ORIGINS debe estar vacío en producción");
  }
  return e;
}

export const env = load();
export const isProd = env.NODE_ENV === "production";

export const allowedOrigins = new Set(
  [env.PUBLIC_SITE_URL, ...env.EXTRA_ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)].map((o) => new URL(o).origin)
);
