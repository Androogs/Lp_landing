/* ============================================================
   Wompi (Bancolombia) · Web Checkout
   Fuentes oficiales (consultadas 2026-10-19):
   - Firma de integridad: SHA256("<Referencia><Monto en centavos><Moneda><SecretoIntegridad>")
     https://docs.wompi.co/docs/colombia/widget-checkout-web/
   - Eventos: SHA256(<valores de signature.properties concatenados><timestamp><SecretoEventos>)
     https://docs.wompi.co/docs/colombia/eventos/
   El navegador NUNCA ve los secretos: las firmas se calculan solo aquí.
   La tarjeta se digita en la página de Wompi: este sistema no recibe, procesa ni guarda datos de tarjeta.
   ============================================================ */
import { env } from "../../config/env.js";
import { safeEqual, sha256Hex } from "../../security/crypto.js";

export const WOMPI_CHECKOUT = "https://checkout.wompi.co/p/";
export const WOMPI_API = env.WOMPI_ENV === "production" ? "https://production.wompi.co/v1" : "https://sandbox.wompi.co/v1";

export function integritySignature(reference: string, amountInCents: number, currency = "COP", secret = env.WOMPI_INTEGRITY_SECRET): string {
  return sha256Hex(`${reference}${amountInCents}${currency}${secret}`);
}

export function checkoutUrl(reference: string, amountInCents: number): string {
  const p = new URLSearchParams({
    "public-key": env.WOMPI_PUBLIC_KEY,
    currency: "COP",
    "amount-in-cents": String(amountInCents),
    reference,
    "signature:integrity": integritySignature(reference, amountInCents),
    "redirect-url": new URL("/pago/resultado", env.PUBLIC_SITE_URL).toString()
  });
  return WOMPI_CHECKOUT + "?" + p.toString();
}

export interface WompiTransaction {
  id: string;
  status: "PENDING" | "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | string;
  reference: string;
  amount_in_cents: number;
  currency: string;
  [k: string]: unknown;
}

export interface WompiEvent {
  event: string;
  data: { transaction?: WompiTransaction } & Record<string, unknown>;
  signature: { properties: string[]; checksum: string };
  timestamp: number;
  environment?: string;
  sent_at?: string;
}

/** Solo se aceptan rutas tipo "transaction.campo" (evita recorridos arbitrarios del objeto) */
const PROP_OK = /^transaction\.[a-z_]{1,40}$/;

function valueAt(data: Record<string, unknown>, path: string): string {
  let cur: unknown = data;
  for (const k of path.split(".")) {
    if (cur === null || typeof cur !== "object" || !Object.prototype.hasOwnProperty.call(cur, k)) return "";
    cur = (cur as Record<string, unknown>)[k];
  }
  return cur === null || cur === undefined ? "" : String(cur);
}

/** Cadena exacta que Wompi firma (útil para pruebas) */
export function eventSigningString(ev: WompiEvent, secret = env.WOMPI_EVENTS_SECRET): string {
  return ev.signature.properties.map((p) => valueAt(ev.data, p)).join("") + String(ev.timestamp) + secret;
}

/** Verifica el checksum del evento (cuerpo y, si llega, el encabezado X-Event-Checksum) en tiempo constante */
export function verifyEvent(ev: WompiEvent, headerChecksum?: string, secret = env.WOMPI_EVENTS_SECRET): boolean {
  if (!ev?.signature || !Array.isArray(ev.signature.properties) || typeof ev.signature.checksum !== "string") return false;
  if (!ev.signature.properties.length || ev.signature.properties.length > 20 || !ev.signature.properties.every((p) => PROP_OK.test(p))) return false;
  if (!Number.isInteger(ev.timestamp)) return false;
  const expected = sha256Hex(eventSigningString(ev, secret));
  const bodyOk = safeEqual(expected, ev.signature.checksum.toLowerCase());
  const headerOk = headerChecksum === undefined || safeEqual(expected, headerChecksum.toLowerCase());
  return bodyOk && headerOk;
}

export type FetchTransaction = (id: string) => Promise<WompiTransaction | null>;

/** Consulta la transacción directamente en la API de Wompi (fuente de verdad) */
export const fetchTransaction: FetchTransaction = async (id) => {
  if (!/^[\w-]{5,80}$/.test(id)) return null;
  const r = await fetch(`${WOMPI_API}/transactions/${encodeURIComponent(id)}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    redirect: "error"
  });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("Wompi respondió " + r.status);
  const j = (await r.json()) as { data?: WompiTransaction };
  return j.data ?? null;
};

/** Estado de Wompi → estado del pedido */
export const STATUS_MAP: Record<string, string | undefined> = {
  APPROVED: "PAGADO",
  DECLINED: "RECHAZADO",
  VOIDED: "ANULADO",
  ERROR: "ERROR_PAGO"
};

/** Transiciones permitidas: un pedido PAGADO nunca vuelve a "rechazado"; solo puede anularse */
const DESDE: Record<string, string[]> = {
  PAGADO: ["PENDIENTE_PAGO", "RECHAZADO", "ERROR_PAGO"],
  RECHAZADO: ["PENDIENTE_PAGO", "ERROR_PAGO"],
  ERROR_PAGO: ["PENDIENTE_PAGO"],
  ANULADO: ["PENDIENTE_PAGO", "PAGADO"]
};
export const puedeTransitar = (de: string, a: string) => (DESDE[a] || []).includes(de);
