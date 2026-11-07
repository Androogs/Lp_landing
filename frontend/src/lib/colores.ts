/* Degradados de marca y fondos de tarjeta de producto.
   v6: solo las dos combinaciones de degradado de José (material-cliente/referencias/degradados-calido-fresco.jpg).
   Cálido = rojo #ef1c25 → naranja #f2592a → ámbar #feb140 · Fresco = verde #399933 → verde claro #89c93c → amarillo #fcca33.
   Los nombres viejos se conservan porque data.ts → FONDO_PRODUCTO los usa. */
import type { CSSProperties } from "react";
import type { Producto } from "@/types";

/** Estilo inline que admite variables CSS (--c1, --g1, …) */
export type CSSVars = CSSProperties & Record<`--${string}`, string | number>;

const CALIDO = ["#ef1c25", "#f2592a", "#feb140"];
const FRESCO = ["#399933", "#89c93c", "#fcca33"];
const CALIDO_INV = CALIDO.slice().reverse();
const FRESCO_INV = FRESCO.slice().reverse();

const FONDOS: Record<string, string[]> = {
  rojoCrema: CALIDO, rojoNaranja: CALIDO, naranjaCrema: CALIDO_INV, amarilloNaranja: CALIDO_INV, rosaCrema: CALIDO_INV,
  verdeLima: FRESCO, mentaClaro: FRESCO, cieloClaro: FRESCO, verdeClaro: FRESCO_INV, cremaAmarillo: FRESCO_INV
};

/** Las 3 paradas de la combinación que corresponde a un color de la paleta (verdes → fresco, el resto → cálido). */
export function degradado(color: string | undefined): string[] {
  const c = String(color || "").toLowerCase();
  const fresco = /^#(399933|89c93c|fcca33|35a83f|8fd14f|16833a|2f9e44|5cb7e6)$/.test(c);
  const g = (fresco ? FRESCO : CALIDO).slice();
  if (c === "#feb140" || c === "#89c93c") g.reverse();
  return g;
}

export function gradVars(color: string | undefined): CSSVars {
  const g = degradado(color);
  return { "--g1": g[0], "--g2": g[1], "--g3": g[2] };
}

/** Para textos: misma familia pero siempre con el color oscuro primero para que se lea mejor */
export function gradVarsTexto(color: string | undefined): CSSVars {
  const g = degradado(color);
  if (g[0] === "#feb140" || g[0] === "#fcca33") g.reverse();
  return { "--g1": g[0], "--g2": g[1], "--g3": g[2] };
}

const POR_LIQUIDO: Record<string, string[]> = {
  oscuro: ["cremaAmarillo", "naranjaCrema", "rojoCrema", "verdeLima"],
  ambar: ["verdeClaro", "amarilloNaranja", "rojoCrema", "verdeLima"],
  claro: ["cieloClaro", "mentaClaro", "rojoNaranja", "verdeClaro"],
  color: ["naranjaCrema", "cremaAmarillo", "rojoCrema"]
};

function grupoLiquido(p: Producto): string {
  const l = (p.arte?.liquido || "").toLowerCase();
  if (/#8a4512|#5d0f27|#5a3a1d|#111|#2b2b2b|#0b0b0b/.test(l)) return "oscuro";
  if (/#c9731d|#e2a33a|#f3cf6a|#f2b53c|#e3c39a|#f1e6b8/.test(l)) return "ambar";
  if (/#dfeefc|#e8f4ff|#eef3f8|#f7f3e8|#fff|#dff3ff/.test(l)) return "claro";
  return "color";
}

/** Fondo gráfico de cada producto (brief v5): degradado que contrasta con la botella */
export function fondoProducto(p: Producto): { style: CSSVars; clase: string } {
  let hh = 0;
  const s = String(p.id);
  for (let i = 0; i < s.length; i++) hh = (hh * 31 + s.charCodeAt(i)) | 0;
  hh = Math.abs(hh);
  const lista = POR_LIQUIDO[grupoLiquido(p)];
  const f = (p.fondo && FONDOS[p.fondo]) || FONDOS[lista[hh % lista.length]];
  return { style: { "--f1": f[0], "--f2": f[1], "--f3": f[2] || f[1] }, clase: "pc-v" + (hh % 5) };
}
