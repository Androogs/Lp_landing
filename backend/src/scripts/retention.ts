/* Política de retención (Ley 1581: los datos se conservan solo el tiempo necesario).
   Anonimiza pedidos cerrados con más de RETENTION_MONTHS meses, solicitudes mayoristas viejas y borra sesiones vencidas.
   Programar diariamente (cron o tarea del contenedor). */
import { env } from "../config/env.js";
import { pool } from "../db/pool.js";
import { audit } from "../lib/audit.js";

const m = env.RETENTION_MONTHS;
const pedidos = await pool.query(
  `UPDATE orders SET nombre_enc=NULL, telefono_enc=NULL, telefono_bidx=NULL, email_enc=NULL, direccion_enc=NULL, barrio_enc=NULL, notas_enc=NULL, anonymized_at=now()
    WHERE anonymized_at IS NULL AND created_at < now() - make_interval(months => $1)
      AND status IN ('ENTREGADO','CANCELADO','RECHAZADO','ANULADO','ERROR_PAGO')`,
  [m]
);
// Pedidos web que nunca se pagaron ni confirmaron (abandonados): 30 días
const abandonados = await pool.query(
  `UPDATE orders SET status='CANCELADO', nombre_enc=NULL, telefono_enc=NULL, telefono_bidx=NULL, email_enc=NULL, direccion_enc=NULL, barrio_enc=NULL, notas_enc=NULL, anonymized_at=now()
    WHERE anonymized_at IS NULL AND status = 'PENDIENTE_PAGO' AND created_at < now() - interval '30 days'`
);
const leads = await pool.query(
  "UPDATE leads_mayoristas SET negocio_enc='-', nombre_enc='-', telefono_enc='-', telefono_bidx='-' WHERE created_at < now() - make_interval(months => $1) AND telefono_bidx <> '-'",
  [m]
);
const ses = await pool.query("DELETE FROM sessions WHERE expires_at < now()");
const resumen = { pedidos: pedidos.rowCount, abandonados: abandonados.rowCount, solicitudes: leads.rowCount, sesiones: ses.rowCount };
await audit("retention.run", null, resumen);
console.log("Retención aplicada:", resumen);
await pool.end();
