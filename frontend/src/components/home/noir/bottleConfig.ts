/* Configuración compartida de la botella (sin Three.js, para no cargarlo en el bundle inicial) */
/** Valores que anima el scroll (GSAP escribe aquí, la escena lee) */
export interface BottleState {
  rotY: number;   // giro sobre su eje (radianes)
  x: number;      // desplazamiento horizontal (unidades de escena)
  y: number;      // desplazamiento vertical
  scale: number;
  tilt: number;   // inclinación lateral (radianes)
  liquid: number; // 0 whisky · 1 ron · 2 aguardiente · 3 tequila (valores intermedios mezclan)
  dust: number;   // intensidad de las partículas doradas 0..1
}

export const initialBottleState = (): BottleState => ({ rotY: -0.35, x: 0, y: 0, scale: 1, tilt: 0, liquid: 0, dust: 0.6 });

/** Colores del líquido por destilado: [profundo, luz, opacidad] */
export const LICORES: { nombre: string; deep: string; light: string; alpha: number }[] = [
  { nombre: "Whisky", deep: "#3a1404", light: "#f0a03a", alpha: 0.95 },
  { nombre: "Ron", deep: "#240803", light: "#b84d1c", alpha: 0.97 },
  { nombre: "Aguardiente", deep: "#7d918b", light: "#eef3ee", alpha: 0.2 },
  { nombre: "Tequila", deep: "#5a3408", light: "#f7c75e", alpha: 0.93 }
];

/** Color de ambiente de cada destilado (resplandor de fondo y luces de contorno) */
export const AMBIENTE = ["#c8862e", "#9e2d16", "#6f8f86", "#d9a441"];

export const FRANJA = ["#ef1c25", "#f2592a", "#feb140", "#89c93c", "#399933"];

export function webglDisponible(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"));
    // libera el contexto de prueba (los navegadores limitan cuántos hay abiertos)
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

