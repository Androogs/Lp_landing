/* Pauta: medición de impresiones y clics.
   Se guarda en localStorage y, si existe data.pauta.webhook, se envía a n8n (formulario simple, sin preflight CORS). */
import { data } from "@/data/data";
import { KEYS, readStore, writeStore } from "./storage";

export type TipoEvento = "imp" | "clic";
export type PautaStats = Record<string, { imp: number; clic: number }>;

export function track(tipo: TipoEvento, id: string, extra?: { pos?: string }): void {
  try {
    const st = readStore<PautaStats>(KEYS.pautaStats) || {};
    st[id] = st[id] || { imp: 0, clic: 0 };
    st[id][tipo] = (st[id][tipo] || 0) + 1;
    writeStore(KEYS.pautaStats, st);
    const wh = data.pauta.webhook;
    if (wh && location.protocol !== "file:") {
      const datos = new URLSearchParams({
        evento: tipo,
        banner: id,
        pos: extra?.pos || "",
        pagina: location.pathname.replace(/^\//, "") || "index"
      });
      if (navigator.sendBeacon) navigator.sendBeacon(wh, datos);
      else fetch(wh, { method: "POST", body: datos, keepalive: true, mode: "no-cors" }).catch(() => undefined);
    }
  } catch {
    /* la medición nunca debe romper la página */
  }
}

/** Impresión una sola vez por sesión por banner */
export function trackImpresionUnica(id: string, pos?: string): void {
  let vistos: Record<string, number> = {};
  try {
    vistos = JSON.parse(sessionStorage.getItem(KEYS.pautaVistos) || "{}");
  } catch {
    /* sin sessionStorage */
  }
  if (vistos[id]) return;
  vistos[id] = 1;
  try {
    sessionStorage.setItem(KEYS.pautaVistos, JSON.stringify(vistos));
  } catch {
    /* sin sessionStorage */
  }
  track("imp", id, { pos });
}
