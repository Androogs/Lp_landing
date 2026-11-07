/* Rotación de clave de cifrado.
   1) Genera una clave nueva y agrégala: DATA_ENCRYPTION_KEYS=v1:<vieja>,v2:<nueva>  DATA_ENCRYPTION_ACTIVE=v2
   2) Ejecuta este script: re-cifra todo lo que siga con claves anteriores.
   3) Cuando termine sin errores, retira v1 de DATA_ENCRYPTION_KEYS. */
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { audit } from "../lib/audit.js";
import { decrypt, encrypt, keyIdOf } from "../security/crypto.js";

const TABLAS: Record<string, { pk: string; cols: Record<string, string> }> = {
  orders: { pk: "id", cols: { nombre_enc: "orders.nombre", telefono_enc: "orders.telefono", email_enc: "orders.email", direccion_enc: "orders.direccion", barrio_enc: "orders.barrio", notas_enc: "orders.notas" } },
  users: { pk: "id", cols: { nombre_enc: "users.nombre", totp_secret_enc: "users.totp" } },
  leads_mayoristas: { pk: "id", cols: { negocio_enc: "leads.negocio", nombre_enc: "leads.nombre", telefono_enc: "leads.telefono" } },
  privacy_requests: { pk: "id", cols: { nombre_enc: "privacy.nombre", telefono_enc: "privacy.telefono", email_enc: "privacy.email", detalle_enc: "privacy.detalle" } }
};

let total = 0;
for (const [tabla, { pk, cols }] of Object.entries(TABLAS)) {
  const { rows } = await pool.query(`SELECT ${pk}, ${Object.keys(cols).join(", ")} FROM ${tabla}`);
  for (const row of rows) {
    const sets: string[] = [];
    const vals: unknown[] = [row[pk]];
    for (const [col, aad] of Object.entries(cols)) {
      const v = row[col] as string | null;
      if (!v || v === "-" || keyIdOf(v) === env.DATA_ENCRYPTION_ACTIVE) continue;
      vals.push(encrypt(decrypt(v, aad), aad));
      sets.push(`${col} = $${vals.length}`);
    }
    if (sets.length) {
      await pool.query(`UPDATE ${tabla} SET ${sets.join(", ")} WHERE ${pk} = $1`, vals);
      total += sets.length;
    }
  }
}
await audit("keys.rotated", null, { activa: env.DATA_ENCRYPTION_ACTIVE, valores: total });
console.log(`Re-cifrados ${total} valores con ${env.DATA_ENCRYPTION_ACTIVE}.`);
await pool.end();
