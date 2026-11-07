/* Exporta el catálogo del frontend (src/data/data.ts) a backend/src/db/seed/products.json.
   El servidor cobra con estos precios: ejecuta esto cada vez que cambies precios en el frontend
   y luego `npm run db:seed`. Uso: npm run catalog:export */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// @ts-ignore: archivo del frontend (TypeScript compartido)
import { data } from "../../frontend/src/data/data.ts";

type P = { id: string; nombre: string; categoria: string; presentacion: string; detal: number; mayor: number; stock?: string };
const out = (data.productos as P[]).map((p) => ({
  id: p.id, nombre: p.nombre, categoria: p.categoria, presentacion: p.presentacion, detal: p.detal, mayor: p.mayor, stock: p.stock || "disponible"
}));
const dest = join(dirname(fileURLToPath(import.meta.url)), "../src/db/seed/products.json");
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log(`Catálogo exportado: ${out.length} productos → ${dest}`);
