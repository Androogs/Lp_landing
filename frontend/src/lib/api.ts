/* ============================================================
   Cliente del API (mismo dominio: /api/…)
   - Cookies de sesión HttpOnly: el JavaScript nunca ve el token de sesión
   - Token CSRF en el encabezado X-CSRF-Token en toda petición que modifica datos
   - Tiempo máximo de espera y errores con mensajes seguros para el usuario
   ============================================================ */
const BASE = "/api";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: { campo: string; error: string }[]) {
    super(message);
  }
}

let csrf: string | null = null;

async function getCsrf(force = false): Promise<string> {
  if (csrf && !force) return csrf;
  const r = await fetch(BASE + "/csrf", { credentials: "same-origin", cache: "no-store" });
  if (!r.ok) throw new ApiError(r.status, "CSRF", "No pudimos conectar con la tienda. Inténtalo de nuevo.");
  csrf = ((await r.json()) as { csrfToken: string }).csrfToken;
  return csrf;
}

/** Algunas respuestas (login) traen un token CSRF nuevo */
export const setCsrf = (t: string | undefined) => {
  if (t) csrf = t;
};

async function request<T>(method: string, path: string, body?: unknown, reintento = true): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
    headers["X-CSRF-Token"] = await getCsrf();
  }
  let r: Response;
  try {
    r = await fetch(BASE + path, {
      method,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000)
    });
  } catch {
    throw new ApiError(0, "RED", "Sin conexión con la tienda. Revisa tu internet e inténtalo de nuevo.");
  }
  const data = (await r.json().catch(() => ({}))) as { error?: { code: string; message: string; details?: { campo: string; error: string }[] } } & T;
  if (!r.ok) {
    // token CSRF vencido: se pide uno nuevo y se reintenta una sola vez
    if (r.status === 403 && data.error?.code === "CSRF" && reintento) {
      await getCsrf(true);
      return request<T>(method, path, body, false);
    }
    throw new ApiError(r.status, data.error?.code || "ERROR", data.error?.message || "Ocurrió un error. Inténtalo de nuevo.", data.error?.details);
  }
  return data;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body)
};

/** Mensaje legible con los campos inválidos que devolvió el servidor */
export function mensajeError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.details?.length) return e.message + " " + e.details.map((d) => `${d.campo.split(".").pop()}: ${d.error}`).join(" · ");
    return e.message;
  }
  return "Ocurrió un error. Inténtalo de nuevo.";
}

/* ---------- Tipos de respuesta ---------- */
export interface Usuario { usuario: string; nombre: string; rol: "mayorista" | "admin" }
export interface PedidoCreado {
  reference: string;
  estado: string;
  etiqueta: string;
  total: number;
  items: { id: string; qty: number; unit: number; subtotal: number }[];
  pago: { proveedor: "wompi"; checkoutUrl: string } | null;
}
export interface EstadoPedido { reference: string; estado: string; etiqueta: string; paso: number; total: number; creado: string }
