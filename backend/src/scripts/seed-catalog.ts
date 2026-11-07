/* Carga/actualiza el catálogo con precios autorizados (fuente: src/db/seed/products.json) */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { pool } from "../db/pool.js";

const Prod = z.object({
  id: z.string().regex(/^p\d{1,4}$/),
  nombre: z.string().min(1).max(200),
  categoria: z.string().min(1).max(60),
  presentacion: z.string().min(1).max(60),
  detal: z.number().int().positive(),
  mayor: z.number().int().positive(),
  stock: z.enum(["disponible", "pocas", "agotado"])
});

export async function seedCatalog(): Promise<number> {
  const file = join(dirname(fileURLToPath(import.meta.url)), "../db/seed/products.json");
  const list = z.array(Prod).parse(JSON.parse(readFileSync(file, "utf8")));
  // Si una oferta deja el precio al detal por debajo del mayorista, se advierte: el servidor cobra el MENOR de los dos
  for (const p of list) {
    if (p.mayor > p.detal) console.warn(`Aviso: ${p.id} (${p.nombre}) tiene precio mayorista ${p.mayor} > detal ${p.detal}; se cobrará ${p.detal}.`);
  }
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    for (const p of list) {
      await c.query(
        `INSERT INTO products(id, nombre, categoria, presentacion, detal, mayor, stock, activo, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true,now())
         ON CONFLICT (id) DO UPDATE SET nombre=$2, categoria=$3, presentacion=$4, detal=$5, mayor=$6, stock=$7, activo=true, updated_at=now()`,
        [p.id, p.nombre, p.categoria, p.presentacion, p.detal, p.mayor, p.stock]
      );
    }
    await c.query("UPDATE products SET activo = false WHERE NOT (id = ANY($1::text[]))", [list.map((p) => p.id)]);
    await c.query("COMMIT");
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
  return list.length;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const n = await seedCatalog();
  console.log(`Catálogo actualizado: ${n} productos.`);
  await pool.end();
}
