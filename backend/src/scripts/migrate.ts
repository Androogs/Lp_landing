import { migrate } from "../db/migrate.js";
import { pool } from "../db/pool.js";

await migrate((m) => console.log(m));
console.log("Base de datos al día.");
await pool.end();
