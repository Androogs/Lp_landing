/* Ilustración SVG de botella por forma (para productos sin foto). Port directo de components.js → BottleArt. */
import { useId } from "react";
import type { ArteBotella, FormaBotella } from "@/types";

interface Forma {
  neckW: number; neckTop: number; ss: number; sy: number; bodyW: number; bottom: number; r: number;
  tipo: "square" | "round" | "slope"; capH: number; label: [number, number]; corcho?: boolean; pet?: boolean;
}

const FORMAS: Partial<Record<FormaBotella, Forma>> & { licor: Forma } = {
  whisky:      { neckW: 22, neckTop: 18, ss: 60, sy: 72,  bodyW: 72, bottom: 232, r: 8,  tipo: "square", capH: 14, label: [112, 62] },
  ron:         { neckW: 22, neckTop: 18, ss: 58, sy: 86,  bodyW: 70, bottom: 232, r: 10, tipo: "round",  capH: 14, label: [118, 62] },
  aguardiente: { neckW: 20, neckTop: 14, ss: 50, sy: 74,  bodyW: 58, bottom: 232, r: 6,  tipo: "round",  capH: 14, label: [112, 66] },
  tequila:     { neckW: 24, neckTop: 30, ss: 70, sy: 94,  bodyW: 78, bottom: 232, r: 10, tipo: "round",  capH: 20, label: [124, 60] },
  vodka:       { neckW: 22, neckTop: 16, ss: 50, sy: 62,  bodyW: 62, bottom: 232, r: 5,  tipo: "square", capH: 14, label: [104, 70] },
  ginebra:     { neckW: 22, neckTop: 14, ss: 48, sy: 78,  bodyW: 66, bottom: 232, r: 8,  tipo: "square", capH: 14, label: [110, 66] },
  vino:        { neckW: 20, neckTop: 10, ss: 70, sy: 118, bodyW: 60, bottom: 234, r: 6,  tipo: "slope",  capH: 26, label: [142, 56] },
  espumoso:    { neckW: 22, neckTop: 10, ss: 64, sy: 126, bodyW: 66, bottom: 234, r: 10, tipo: "slope",  capH: 30, label: [148, 54], corcho: true },
  cerveza:     { neckW: 18, neckTop: 12, ss: 72, sy: 112, bodyW: 54, bottom: 234, r: 6,  tipo: "slope",  capH: 10, label: [136, 56] },
  crema:       { neckW: 24, neckTop: 18, ss: 60, sy: 88,  bodyW: 70, bottom: 232, r: 10, tipo: "round",  capH: 14, label: [118, 62] },
  brandy:      { neckW: 24, neckTop: 24, ss: 66, sy: 104, bodyW: 82, bottom: 232, r: 16, tipo: "round",  capH: 16, label: [128, 58] },
  licor:       { neckW: 22, neckTop: 16, ss: 56, sy: 78,  bodyW: 64, bottom: 232, r: 8,  tipo: "square", capH: 14, label: [112, 64] },
  garrafa:     { neckW: 24, neckTop: 22, ss: 60, sy: 92,  bodyW: 94, bottom: 232, r: 14, tipo: "round",  capH: 14, label: [124, 60] },
  gaseosa:     { neckW: 24, neckTop: 14, ss: 56, sy: 84,  bodyW: 60, bottom: 234, r: 8,  tipo: "round",  capH: 12, label: [120, 60], pet: true }
};

function bodyPath(f: Forma): string {
  const cx = 60, nL = cx - f.neckW / 2, nR = cx + f.neckW / 2, bL = cx - f.bodyW / 2, bR = cx + f.bodyW / 2;
  const { ss, sy, bottom: bt, r } = f;
  const d = sy - ss;
  let shL: string, shR: string;
  if (f.tipo === "square") {
    shL = `C ${nL} ${ss + d * 0.9} ${bL} ${ss + d * 0.15} ${bL} ${sy}`;
    shR = `C ${bR} ${ss + d * 0.15} ${nR} ${ss + d * 0.9} ${nR} ${ss}`;
  } else if (f.tipo === "slope") {
    shL = `C ${nL} ${ss + d * 0.55} ${bL} ${ss + d * 0.35} ${bL} ${sy}`;
    shR = `C ${bR} ${ss + d * 0.35} ${nR} ${ss + d * 0.55} ${nR} ${ss}`;
  } else {
    shL = `C ${nL} ${ss + d * 0.75} ${bL} ${ss + d * 0.2} ${bL} ${sy}`;
    shR = `C ${bR} ${ss + d * 0.2} ${nR} ${ss + d * 0.75} ${nR} ${ss}`;
  }
  return `M${nL} ${f.neckTop} L${nL} ${ss} ${shL} L${bL} ${bt - r} Q${bL} ${bt} ${bL + r} ${bt} L${bR - r} ${bt} Q${bR} ${bt} ${bR} ${bt - r} L${bR} ${sy} ${shR} L${nR} ${f.neckTop} Z`;
}

function LabelText({ txt = "", sub, x, y, w, color }: { txt?: string; sub?: string; x: number; y: number; w: number; color: string }) {
  const fs = txt.length <= 6 ? 11 : txt.length <= 9 ? 9.6 : txt.length <= 12 ? 8.2 : 7.2;
  const est = txt.length * fs * 0.66;
  const fit = est > w - 8 ? { textLength: w - 8, lengthAdjust: "spacingAndGlyphs" } : {};
  let subEl = null;
  if (sub) {
    const fs2 = sub.length <= 3 ? 12 : sub.length <= 8 ? 7.2 : 6;
    const est2 = sub.length * fs2 * 0.66;
    const fit2 = est2 > w - 10 ? { textLength: w - 10, lengthAdjust: "spacingAndGlyphs" } : {};
    subEl = (
      <text x={x} y={y + (sub.length <= 3 ? 14 : 11)} textAnchor="middle" fontSize={fs2} fill={color} opacity=".8" {...fit2}>
        {sub}
      </text>
    );
  }
  return (
    <>
      <text x={x} y={y} textAnchor="middle" fontSize={fs} fill={color} letterSpacing=".04" {...fit}>
        {txt}
      </text>
      {subEl}
    </>
  );
}

const BOLSA = "M26 30 L94 30 L98 44 L92 58 L96 72 L92 88 L96 104 L92 120 L96 136 L92 152 L96 168 L92 184 L96 200 L92 216 L94 230 L26 230 L28 216 L24 200 L28 184 L24 168 L28 152 L24 136 L28 120 L24 104 L28 88 L24 72 L28 58 L22 44 Z";

export function BottleArt({ arte = {}, className }: { arte?: ArteBotella; className?: string }) {
  const id = "b" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const forma = arte.forma || "licor";
  const liq = arte.liquido || "#c9731d";
  const ac = arte.acento || "#222";
  const cls = "bottle" + (className ? " " + className : "");

  const defs = (
    <defs>
      <linearGradient id={id + "l"} x1="0" x2="1">
        <stop offset="0" stopColor={liq} stopOpacity=".92" />
        <stop offset=".45" stopColor={liq} />
        <stop offset="1" stopColor="#000" stopOpacity=".55" />
      </linearGradient>
      <linearGradient id={id + "g"} x1="0" x2="1">
        <stop offset="0" stopColor="#fff" stopOpacity=".55" />
        <stop offset=".3" stopColor="#fff" stopOpacity=".08" />
        <stop offset=".75" stopColor="#fff" stopOpacity="0" />
        <stop offset="1" stopColor="#fff" stopOpacity=".25" />
      </linearGradient>
    </defs>
  );
  const svgProps = { className: cls, viewBox: "0 0 120 240", xmlns: "http://www.w3.org/2000/svg", role: "img", "aria-label": arte.etiqueta || "" };

  if (forma === "lata") {
    const w = 70, x = 60 - w / 2, top = 34, bot = 230;
    return (
      <svg {...svgProps}>
        {defs}
        <path d={`M${x} ${top + 8} Q${x} ${top} ${x + 8} ${top} L${x + w - 8} ${top} Q${x + w} ${top} ${x + w} ${top + 8} L${x + w} ${bot - 8} Q${x + w} ${bot} ${x + w - 8} ${bot} L${x + 8} ${bot} Q${x} ${bot} ${x} ${bot - 8} Z`} fill={ac} />
        <rect x={x + 2} y={top + 12} width={w - 4} height={bot - top - 30} rx="3" fill={liq} opacity=".92" />
        <ellipse cx="60" cy={top} rx={w / 2 - 2} ry="7" fill="#d9d9de" />
        <ellipse cx="60" cy={top} rx={w / 2 - 8} ry="4" fill="#bdbdc4" />
        <rect x="54" y={top - 4} width="12" height="4" rx="1.5" fill="#9a9aa2" />
        <rect x={x} y={top} width={w} height={bot - top} rx="8" fill={`url(#${id}g)`} />
        <rect x={x + 6} y={104} width={w - 12} height="52" rx="6" fill="#fff" opacity=".96" />
        <rect x={x + 6} y="104" width={w - 12} height="5" rx="2.5" fill={ac} />
        <LabelText txt={arte.etiqueta} sub={arte.sub} x={60} y={132} w={w - 12} color="#111" />
      </svg>
    );
  }
  if (forma === "bolsa") {
    return (
      <svg {...svgProps}>
        {defs}
        <path d={BOLSA} fill={ac} />
        <rect x="30" y="52" width="60" height="156" rx="10" fill={liq} opacity=".9" />
        <path d={BOLSA} fill={`url(#${id}g)`} />
        <rect x="34" y="104" width="52" height="50" rx="8" fill="#fff" opacity=".96" />
        <rect x="34" y="104" width="52" height="5" rx="2.5" fill={ac} />
        <LabelText txt={arte.etiqueta} sub={arte.sub} x={60} y={131} w={52} color="#111" />
      </svg>
    );
  }
  if (forma === "caja") {
    return (
      <svg {...svgProps}>
        {defs}
        <rect x="28" y="50" width="64" height="150" rx="6" fill={liq} />
        <rect x="28" y="50" width="64" height="40" rx="6" fill={ac} />
        <rect x="28" y="84" width="64" height="6" fill={ac} opacity=".6" />
        <rect x="28" y="50" width="64" height="150" rx="6" fill={`url(#${id}g)`} />
        <LabelText txt={arte.etiqueta} sub={arte.sub} x={60} y={130} w={56} color="#111" />
      </svg>
    );
  }

  const f = FORMAS[forma] || FORMAS.licor;
  const p = bodyPath(f);
  const cx = 60;
  const capY = f.neckTop - f.capH + 6, capW = f.neckW + 6;
  const lw = f.bodyW - 14, ly = f.label[0], lh = f.label[1], lx = cx - lw / 2;

  let tapa;
  if (f.corcho) {
    tapa = (
      <>
        <rect x={cx - capW / 2} y={capY} width={capW} height={f.capH + 10} rx="3" fill={ac} />
        <rect x={cx - capW / 2 - 4} y={capY - 6} width={capW + 8} height="12" rx="6" fill={ac} />
      </>
    );
  } else if (f.pet) {
    tapa = (
      <>
        <rect x={cx - capW / 2} y={capY} width={capW} height={f.capH} rx="3" fill={ac} />
        <rect x={cx - capW / 2 - 2} y={capY + f.capH} width={capW + 4} height="4" rx="2" fill={ac} opacity=".6" />
      </>
    );
  } else {
    tapa = (
      <>
        <rect x={cx - capW / 2} y={capY} width={capW} height={f.capH} rx="3" fill={ac} />
        <rect x={cx - capW / 2} y={capY} width={capW} height="4" rx="2" fill="#fff" opacity=".25" />
      </>
    );
  }

  return (
    <svg {...svgProps}>
      {defs}
      <clipPath id={id + "c"}>
        <path d={p} />
      </clipPath>
      {/* vidrio base */}
      <path d={p} fill="#e9eef3" opacity=".9" />
      {/* líquido (hasta un poco debajo del hombro) */}
      <rect x="0" y={f.sy - 6} width="120" height="240" fill={`url(#${id}l)`} clipPath={`url(#${id}c)`} />
      {/* reflejo lateral */}
      <rect x={cx - f.bodyW / 2 + 4} y={f.sy + 6} width="7" height={f.bottom - f.sy - 22} rx="3.5" fill="#fff" opacity=".35" clipPath={`url(#${id}c)`} />
      <path d={p} fill={`url(#${id}g)`} />
      <path d={p} fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="1.2" />
      {tapa}
      {/* etiqueta */}
      <rect x={lx} y={ly} width={lw} height={lh} rx="5" fill="#fff" opacity=".97" />
      <rect x={lx} y={ly} width={lw} height="6" rx="3" fill={ac} />
      <rect x={lx + 8} y={ly + lh - 8} width={lw - 16} height="2" rx="1" fill={ac} opacity=".5" />
      <LabelText txt={arte.etiqueta} sub={arte.sub} x={cx} y={ly + lh / 2 + (arte.sub ? -1 : 4)} w={lw} color="#111" />
    </svg>
  );
}
