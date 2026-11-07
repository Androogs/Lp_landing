import { randomBytes } from "node:crypto";

const k = (seed: string) => Buffer.from(seed.padEnd(32, "x").slice(0, 32)).toString("base64");

export const TEST = {
  integrity: "test_integrity_secreto_123456",
  events: "test_events_secreto_abcdef123",
  site: "https://licorespalmira.test"
};

export function setTestEnv(databaseUrl: string) {
  Object.assign(process.env, {
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    TRUST_PROXY: "1",
    PUBLIC_SITE_URL: TEST.site,
    DATABASE_URL: databaseUrl,
    DATA_ENCRYPTION_KEYS: `v1:${k("clave-v1")},v2:${k("clave-v2")}`,
    DATA_ENCRYPTION_ACTIVE: "v2",
    BLIND_INDEX_KEY: k("blind"),
    PASSWORD_PEPPER: k("pepper"),
    CSRF_SECRET: k("csrf"),
    WOMPI_ENV: "sandbox",
    WOMPI_PUBLIC_KEY: "pub_test_" + randomBytes(8).toString("hex"),
    WOMPI_INTEGRITY_SECRET: TEST.integrity,
    WOMPI_EVENTS_SECRET: TEST.events,
    WOMPI_VERIFY_WITH_API: "true"
  });
}
