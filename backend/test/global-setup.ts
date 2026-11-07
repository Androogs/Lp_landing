/* Prepara una base de datos limpia con el usuario dueño y luego las pruebas corren con el rol de MÍNIMO PRIVILEGIO (lp_app) */
import pg from "pg";
import { setTestEnv } from "./env.js";

export default async function () {
  const owner = process.env.TEST_DB_OWNER_URL || "postgres://postgres@localhost:5433/lp_test?host=/tmp";
  const c = new pg.Client({ connectionString: owner });
  await c.connect();
  await c.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; REVOKE CREATE ON SCHEMA public FROM PUBLIC;");
  await c.end();
  setTestEnv(owner);
  const { migrate } = await import("../src/db/migrate.js");
  const { seedCatalog } = await import("../src/scripts/seed-catalog.js");
  const { pool } = await import("../src/db/pool.js");
  await migrate();
  await seedCatalog();
  await pool.end();
}
