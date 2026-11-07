import { tx } from "../../db/pool.js";
import { audit } from "../../lib/audit.js";
import { puedeTransitar, STATUS_MAP } from "./wompi.js";
export async function reconcile(t, req) {
    return tx(async (c) => {
        const { rows } = await c.query("SELECT id, status, amount_in_cents, currency, payment_method, wompi_transaction_id FROM orders WHERE reference = $1 FOR UPDATE", [t.reference]);
        const o = rows[0];
        if (!o)
            return { outcome: "pedido_inexistente" };
        // El monto y la moneda deben coincidir EXACTAMENTE con lo que calculó el servidor al crear el pedido
        if (o.payment_method !== "wompi" || Number(o.amount_in_cents) !== Number(t.amount_in_cents) || o.currency !== t.currency) {
            void audit("payment.event.mismatch", req, { reference: t.reference, esperado: Number(o.amount_in_cents), recibido: t.amount_in_cents, moneda: t.currency });
            return { outcome: "no_coincide", reference: t.reference };
        }
        const nuevo = STATUS_MAP[t.status];
        if (!nuevo || nuevo === o.status)
            return { outcome: "sin_cambio", status: o.status, reference: t.reference };
        if (!puedeTransitar(o.status, nuevo))
            return { outcome: "transicion_invalida", status: o.status, reference: t.reference };
        await c.query("UPDATE orders SET status = $2, wompi_transaction_id = $3, paid_at = CASE WHEN $2 = 'PAGADO' THEN now() ELSE paid_at END WHERE id = $1", [o.id, nuevo, t.id]);
        void audit(nuevo === "PAGADO" ? "order.paid" : "order.payment_rejected", req, { reference: t.reference, status: nuevo, transaccion: t.id });
        return { outcome: "actualizado", status: nuevo, reference: t.reference };
    });
}
