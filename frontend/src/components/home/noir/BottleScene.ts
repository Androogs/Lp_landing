/* ============================================================
   BottleScene · botella 3D de Licores Palmira (Three.js)
   ------------------------------------------------------------
   Escena sin dependencias de React. El componente HeroBottle le
   pasa un objeto `state` que GSAP anima con el scroll; aquí solo
   se lee ese objeto en cada cuadro y se dibuja.
   Todo se genera en código (geometría por torno + etiquetas en
   <canvas>), así que no hay modelos .glb ni HDR que descargar y
   cumple la CSP del sitio (img-src 'self' data:).
   ============================================================ */
import {
  ACESFilmicToneMapping, AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, CanvasTexture, Color, CylinderGeometry,
  DirectionalLight, DoubleSide, Group, LatheGeometry, Mesh, MeshPhysicalMaterial, MeshStandardMaterial,
  PerspectiveCamera, PlaneGeometry, PMREMGenerator, PointLight, Points, RepeatWrapping, Scene, ShaderMaterial,
  SplineCurve, SRGBColorSpace, Texture, TorusGeometry, Vector2, WebGLRenderer, type Material
} from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { AMBIENTE, FRANJA, LICORES, type BottleState } from "./bottleConfig";

/* ---------- utilidades ---------- */
function mezclar(a: Color, b: Color, t: number, out: Color) {
  return out.copy(a).lerp(b, t);
}

function cargarImagen(src: string): Promise<HTMLImageElement | null> {
  return new Promise((ok) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = src;
  });
}

async function fuenteLista(spec: string, ms = 1500) {
  if (!("fonts" in document)) return;
  try {
    await Promise.race([document.fonts.load(spec), new Promise((r) => setTimeout(r, ms))]);
  } catch {
    /* sin fuente: se usa la de respaldo */
  }
}

/** Perfil de la botella (radio, altura) suavizado con una spline */
function perfil(puntos: [number, number][], n = 120) {
  const curva = new SplineCurve(puntos.map(([r, y]) => new Vector2(r, y)));
  return curva.getPoints(n).map((p) => new Vector2(Math.max(0, p.x), p.y));
}

/* ---------- forma de la botella (modelo de referencia: botella de vidrio con estrías en espiral) ---------- */

/** Perfil exterior [radio, altura]: base angosta, cuerpo cónico que se abre hacia el hombro, cuello corto */
const PERFIL_VIDRIO: [number, number][] = [
  [0.0, 0.0], [0.4, 0.0], [0.445, 0.03], [0.455, 0.1], [0.47, 0.3], [0.5, 0.7], [0.53, 1.1],
  [0.552, 1.45], [0.556, 1.6], [0.53, 1.78], [0.45, 1.95], [0.32, 2.08], [0.21, 2.17],
  [0.178, 2.24], [0.175, 2.3], [0.19, 2.33], [0.196, 2.36], [0.182, 2.385]
];
/* el licor llega hasta el hombro: arriba queda el vidrio vacío con la espiral a la vista */
const PERFIL_LIQUIDO: [number, number][] = [
  [0.0, 0.11], [0.39, 0.11], [0.42, 0.15], [0.43, 0.3], [0.46, 0.7], [0.49, 1.1],
  [0.506, 1.38], [0.51, 1.5], [0.46, 1.535], [0.25, 1.545], [0.0, 1.548]
];

/** Radio del perfil a una altura dada (interpolación lineal entre puntos de la spline) */
function radioEn(puntos: Vector2[], y: number) {
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1], b = puntos[i];
    if ((a.y <= y && b.y >= y) || (a.y >= y && b.y <= y)) {
      const t = b.y === a.y ? 0 : (y - a.y) / (b.y - a.y);
      return a.x + (b.x - a.x) * t;
    }
  }
  return puntos[puntos.length - 1].x;
}

/** Intensidad de las estrías según la altura: nacen a media altura, máximas en hombro y cuello */
function envolvente(y: number) {
  const sube = Math.min(1, Math.max(0, (y - 1.12) / 0.5));
  const corta = 1 - Math.min(1, Math.max(0, (y - 2.27) / 0.05));
  const s = sube * sube * (3 - 2 * sube);
  // en el cuello las estrías son más marcadas (el radio es menor)
  const cuello = 1 + Math.min(1, Math.max(0, (y - 1.9) / 0.25)) * 0.5;
  return s * corta * cuello;
}

const ESTRIAS = 7;       // número de estrías
const TORSION = 3.4;     // radianes de giro por unidad de altura

/** Deforma un torno con estrías en espiral; quita UV para fundir la costura y suavizar normales */
function estriar(g: LatheGeometry, amplitud: number) {
  const pos = g.attributes.position as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const r = Math.hypot(x, z);
    if (r < 1e-5) continue;
    const th = Math.atan2(x, z);
    // onda con cresta redondeada y valle más estrecho, como vidrio soplado
    const w = Math.sin(ESTRIAS * th + TORSION * y);
    const onda = w > 0 ? Math.pow(w, 0.7) : -Math.pow(-w, 1.6) * 0.6;
    const k = 1 + amplitud * envolvente(y) * onda;
    pos.setXYZ(i, (x / r) * r * k, y, (z / r) * r * k);
  }
  g.deleteAttribute("uv");
  g.deleteAttribute("normal");
  const m = mergeVertices(g, 1e-4);
  m.computeVertexNormals();
  g.dispose();
  return m;
}

function texturaCorcho(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  x.fillStyle = "#b9844a";
  x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    const r = Math.random() * 2.2 + 0.4;
    x.fillStyle = Math.random() < 0.55 ? "rgba(120,78,38,.45)" : "rgba(235,200,150,.35)";
    x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, r, 0, Math.PI * 2); x.fill();
  }
  return c;
}

const burbujaVS = /* glsl */ `
  uniform float uTime; uniform float uPR;
  attribute float aSeed; attribute float aR;
  varying float vA;
  void main() {
    vec3 p = position;
    float h = 1.25;
    p.y = 0.2 + mod(p.y - 0.2 + uTime * (0.05 + aSeed * 0.09), h);
    p.x += sin(uTime * 1.3 + aSeed * 30.0) * 0.008;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = (2.0 + aSeed * 5.0) * uPR * (6.0 / -mv.z);
    vA = smoothstep(0.2, 0.35, p.y) * (1.0 - smoothstep(1.32, 1.45, p.y));
    gl_Position = projectionMatrix * mv;
  }`;
const burbujaFS = /* glsl */ `
  uniform float uOpacity;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float anillo = smoothstep(0.5, 0.35, d) * (0.35 + 0.65 * smoothstep(0.15, 0.4, d));
    gl_FragColor = vec4(vec3(1.0, 0.97, 0.9), anillo * vA * uOpacity);
  }`;

/* ---------- etiquetas dibujadas en canvas ---------- */
const SERIF = '"Bodoni Moda", "Didot", "Bodoni 72", Georgia, serif';
const SANS = '"Jost", "Century Gothic", "Futura", system-ui, sans-serif';

function oro(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, "#b4873f");
  g.addColorStop(0.45, "#f3d79a");
  g.addColorStop(0.6, "#e2b866");
  g.addColorStop(1, "#9c7232");
  return g;
}

function papelOscuro(x: CanvasRenderingContext2D, W: number, H: number) {
  x.fillStyle = "#16100b";
  x.fillRect(0, 0, W, H);
  const rg = x.createRadialGradient(W / 2, H * 0.42, 40, W / 2, H / 2, W * 0.75);
  rg.addColorStop(0, "rgba(74,50,28,.6)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = rg;
  x.fillRect(0, 0, W, H);
  const img = x.getImageData(0, 0, W, H);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  x.putImageData(img, 0, 0);
}

function espaciado(x: CanvasRenderingContext2D, v: string) {
  if ("letterSpacing" in x) (x as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = v;
}

function texturaEtiqueta(logo: HTMLImageElement | null, metal: boolean): HTMLCanvasElement {
  const W = 1024, H = 1000;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d")!;
  const tinta = (fill: string | CanvasGradient) => (metal ? "#fff" : fill);

  if (metal) { x.fillStyle = "#000"; x.fillRect(0, 0, W, H); } else papelOscuro(x, W, H);

  // marco doble en oro
  x.strokeStyle = tinta(oro(x, 0, 0, W, H));
  x.lineWidth = 6; x.strokeRect(40, 40, W - 80, H - 80);
  x.lineWidth = 2; x.strokeRect(62, 62, W - 124, H - 124);

  // logo oficial (blanco) arriba
  if (logo && !metal) {
    const lw = 400, lh = (lw * logo.height) / logo.width;
    x.drawImage(logo, (W - lw) / 2, 120, lw, lh);
  }

  x.textAlign = "center";
  x.textBaseline = "alphabetic";
  const yf = 548;
  x.strokeStyle = tinta(oro(x, 280, 0, 744, 0));
  x.lineWidth = 2.5;
  x.beginPath(); x.moveTo(280, yf); x.lineTo(488, yf); x.moveTo(536, yf); x.lineTo(744, yf); x.stroke();
  x.fillStyle = tinta("#e2b866");
  x.beginPath(); x.moveTo(512, yf - 12); x.lineTo(524, yf); x.lineTo(512, yf + 12); x.lineTo(500, yf); x.closePath(); x.fill();

  x.fillStyle = tinta(oro(x, 220, 0, 804, 0));
  x.font = `italic 600 92px ${SERIF}`;
  x.fillText("Reserva", W / 2, 668);
  x.font = `italic 500 60px ${SERIF}`;
  x.fillText("de la Casa", W / 2, 742);

  x.fillStyle = metal ? "#000" : "#efe3cc";
  x.font = `500 27px ${SANS}`;
  espaciado(x, "10px");
  x.fillText("PALMIRA · VALLE DEL CAUCA", W / 2, 822);
  x.fillStyle = tinta("#e2b866");
  x.font = `500 25px ${SANS}`;
  x.fillText("DESDE 1994", W / 2, 900);
  espaciado(x, "0px");
  return c;
}

function texturaContraetiqueta(metal: boolean): HTMLCanvasElement {
  const W = 1024, H = 940;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const x = c.getContext("2d")!;
  const tinta = (fill: string | CanvasGradient) => (metal ? "#fff" : fill);
  if (metal) { x.fillStyle = "#000"; x.fillRect(0, 0, W, H); } else papelOscuro(x, W, H);
  // franja de marca arriba
  if (!metal) FRANJA.forEach((col, i) => { x.fillStyle = col; x.fillRect(80 + ((W - 160) / 5) * i, 92, (W - 160) / 5 + 1, 10); });
  x.strokeStyle = tinta(oro(x, 0, 0, W, H));
  x.lineWidth = 2; x.strokeRect(50, 50, W - 100, H - 100);
  x.textAlign = "center";
  x.fillStyle = tinta(oro(x, 260, 0, 764, 0));
  x.font = `italic 600 70px ${SERIF}`;
  x.fillText("Licorera familiar", W / 2, 228);
  x.fillStyle = metal ? "#000" : "#e9dcc3";
  x.font = `400 36px ${SERIF}`;
  x.fillText("Más de 2.000 referencias,", W / 2, 322);
  x.fillText("al detal y al por mayor,", W / 2, 372);
  x.fillText("con domicilio en Palmira.", W / 2, 422);
  x.strokeStyle = tinta("#b48a45"); x.lineWidth = 2;
  x.beginPath(); x.moveTo(400, 488); x.lineTo(624, 488); x.stroke();
  x.fillStyle = metal ? "#000" : "#cdbb9a";
  x.font = `500 28px ${SANS}`;
  espaciado(x, "3px");
  x.fillText("CL. 31 # 37-56 · CENTRO", W / 2, 566);
  x.fillText("321 867 7680", W / 2, 612);
  espaciado(x, "0px");
  x.fillStyle = metal ? "#000" : "#9d8a6c";
  x.font = `400 22px ${SANS}`;
  x.fillText("El exceso de alcohol es perjudicial para la salud.", W / 2, 760);
  x.fillText("Prohíbase el expendio de bebidas embriagantes", W / 2, 796);
  x.fillText("a menores de edad.", W / 2, 832);
  return c;
}

function texturaCharco(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,.9)");
  g.addColorStop(0.35, "rgba(255,255,255,.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return c;
}

function texturaFranja(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = 500; c.height = 8;
  const x = c.getContext("2d")!;
  FRANJA.forEach((col, i) => { x.fillStyle = col; x.fillRect(i * 100, 0, 101, 8); });
  return c;
}

function texturaSombra(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(0,0,0,.75)");
  g.addColorStop(0.5, "rgba(0,0,0,.35)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 256);
  return c;
}

/* ---------- shaders ---------- */
const liquidoVS = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying float vY;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    vY = position.y;
    gl_Position = projectionMatrix * mv;
  }`;
const liquidoFS = /* glsl */ `
  uniform vec3 uDeep; uniform vec3 uLight; uniform float uAlpha; uniform float uTime;
  varying vec3 vN; varying vec3 vV; varying float vY;
  void main() {
    float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
    // contraluz: el centro deja pasar la luz, los bordes se ven profundos
    float centro = pow(1.0 - f, 1.5);
    vec3 col = mix(uDeep, uLight * 1.15, centro);
    // más claro arriba (la luz entra por el hombro), más oscuro en la base
    col *= mix(0.72, 1.12, smoothstep(0.1, 2.0, vY));
    // vetas lentas que suben, muy sutiles
    float veta = sin(vY * 7.0 - uTime * 0.6 + vN.x * 3.0) * 0.5 + 0.5;
    col += uLight * 0.06 * veta * centro;
    // brillo de borde cálido (luz que rodea el líquido)
    col += uLight * pow(f, 5.0) * 0.35;
    float a = mix(uAlpha, min(1.0, uAlpha + 0.3), smoothstep(0.2, 0.9, f));
    gl_FragColor = vec4(col, a);
  }`;
const bordeVS = liquidoVS;
const bordeFS = /* glsl */ `
  uniform vec3 uColor; uniform float uPower; uniform float uIntensity; uniform float uStrip;
  varying vec3 vN; varying vec3 vV; varying float vY;
  // panel de luz vertical del estudio reflejado en el vidrio (centro en x del vector reflejado)
  float panel(vec3 r, float cx, float ancho) {
    float h = smoothstep(ancho, ancho * 0.35, abs(r.x - cx));
    float v = smoothstep(-0.75, -0.35, r.y) * smoothstep(0.85, 0.45, r.y);
    return h * v * smoothstep(0.0, 0.35, r.z);
  }
  void main() {
    vec3 n = normalize(vN); vec3 v = normalize(vV);
    if (!gl_FrontFacing) n = -n;
    float f = pow(1.0 - abs(dot(n, v)), uPower);
    vec3 r = reflect(-v, n);
    float luz = panel(r, -0.42, 0.11) + 0.55 * panel(r, 0.5, 0.07);
    vec3 col = uColor * f * uIntensity + vec3(1.0, 0.97, 0.92) * luz * uStrip;
    float a = clamp(f * uIntensity + luz * uStrip, 0.0, 1.0);
    gl_FragColor = vec4(col, a);
  }`;
const polvoVS = /* glsl */ `
  uniform float uTime; uniform float uSize; uniform float uPR;
  attribute float aSeed;
  varying float vA;
  void main() {
    vec3 p = position;
    p.y = mod(p.y + uTime * (0.05 + aSeed * 0.08) + 3.5, 7.0) - 3.5;
    p.x += sin(uTime * 0.3 + aSeed * 12.0) * 0.15;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPR * (0.5 + aSeed) * (1.0 / -mv.z);
    vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * (1.0 + aSeed * 2.0) + aSeed * 40.0));
    gl_Position = projectionMatrix * mv;
  }`;
const polvoFS = /* glsl */ `
  uniform vec3 uColor; uniform float uOpacity;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColor, a * vA * uOpacity);
  }`;

const ALTO = 2.6; // alto total de la botella con corcho (unidades)

/* ============================================================ */
export class BottleScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera: PerspectiveCamera;
  private pivot = new Group();
  private botella = new Group();
  private sombra!: Mesh;
  private charco!: Mesh;
  private burbujas!: Points;
  private chrome = 0;
  private polvo!: Points;
  private liquido!: ShaderMaterial;
  private borde!: ShaderMaterial;
  private rimA = new PointLight("#ffb347", 30, 20, 2);
  private rimB = new PointLight("#ef1c25", 22, 20, 2);
  private desechables: { dispose: () => void }[] = [];
  private raf = 0;
  private activo = false;
  private t0 = performance.now();
  private puntero = new Vector2();
  private punteroSuave = new Vector2();
  private tmpA = new Color();
  private tmpB = new Color();
  private ro?: ResizeObserver;

  constructor(private canvas: HTMLCanvasElement, private state: BottleState, private opts: { movil: boolean }) {
    this.renderer = new WebGLRenderer({ canvas, antialias: !opts.movil, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.movil ? 1.5 : 1.75));
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x000000, 0);

    this.camera = new PerspectiveCamera(28, 1, 0.1, 50);
    this.camera.position.set(0, 0, 9);

    const pmrem = new PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    const env = pmrem.fromScene(room, 0.035).texture;
    this.scene.environment = env;
    this.desechables.push(env, pmrem);

    this.scene.add(this.pivot);
    this.pivot.add(this.botella);
    this.botella.position.y = -ALTO / 2;
  }

  /** Construye la botella. Espera las fuentes y el logo para dibujar la etiqueta. */
  async init() {
    await Promise.all([fuenteLista(`italic 600 78px "Bodoni Moda"`), fuenteLista(`500 25px "Jost"`)]);
    const logo = await cargarImagen("/assets/marca/logo-blanco.webp");
    this.construir(logo);
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(this.canvas);
    window.addEventListener("pointermove", this.onPointer, { passive: true });
    this.renderer.render(this.scene, this.camera);
  }

  private track<T extends { dispose: () => void }>(o: T): T {
    this.desechables.push(o);
    return o;
  }

  private construir(logo: HTMLImageElement | null) {
    const seg = this.opts.movil ? 110 : 180;
    const filas = this.opts.movil ? 160 : 240;

    /* Vidrio con estrías en espiral */
    const pVidrio = perfil(PERFIL_VIDRIO, filas);
    const gVidrio = this.track(estriar(new LatheGeometry(pVidrio, seg), 0.13));
    const mVidrio = this.track(new MeshPhysicalMaterial({
      color: "#fff8ee", metalness: 0, roughness: 0.02, transparent: true, opacity: 0.13,
      clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 3.4, side: DoubleSide, depthWrite: false
    }));
    const vidrio = new Mesh(gVidrio, mVidrio);
    vidrio.renderOrder = 3;

    /* Brillo de contorno: con las estrías dibuja cada arista de vidrio */
    this.borde = this.track(new ShaderMaterial({
      vertexShader: bordeVS, fragmentShader: bordeFS, transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uColor: { value: new Color("#ffe6bd") }, uPower: { value: 2.4 }, uIntensity: { value: 1.1 }, uStrip: { value: 0.75 } },
      side: DoubleSide
    }));
    const borde = new Mesh(gVidrio, this.borde);
    borde.renderOrder = 4;

    /* Fondo grueso de cristal */
    const gBase = this.track(new CylinderGeometry(0.43, 0.445, 0.1, seg, 1));
    const mBase = this.track(new MeshPhysicalMaterial({ color: "#efe2cf", roughness: 0.06, transparent: true, opacity: 0.3, clearcoat: 1, envMapIntensity: 2.4 }));
    const base = new Mesh(gBase, mBase);
    base.position.y = 0.055;
    base.renderOrder = 1;

    /* Líquido: sigue las mismas estrías por dentro */
    const pLiq = perfil(PERFIL_LIQUIDO, Math.round(filas * 0.8));
    const gLiq = this.track(estriar(new LatheGeometry(pLiq, seg), 0.13));
    const L0 = LICORES[0];
    this.liquido = this.track(new ShaderMaterial({
      vertexShader: liquidoVS, fragmentShader: liquidoFS, transparent: true,
      uniforms: { uDeep: { value: new Color(L0.deep) }, uLight: { value: new Color(L0.light) }, uAlpha: { value: L0.alpha }, uTime: { value: 0 } }
    }));
    const liquido = new Mesh(gLiq, this.liquido);
    liquido.renderOrder = 2;

    /* Burbujas que suben dentro del licor */
    const nb = this.opts.movil ? 90 : 170;
    const bPos = new Float32Array(nb * 3), bSeed = new Float32Array(nb), bR = new Float32Array(nb);
    for (let i = 0; i < nb; i++) {
      const y = 0.2 + Math.random() * 1.25;
      const r = Math.sqrt(Math.random()) * radioEn(pLiq, Math.min(1.7, y)) * 0.82;
      const th = Math.random() * Math.PI * 2;
      bPos[i * 3] = Math.sin(th) * r; bPos[i * 3 + 1] = y; bPos[i * 3 + 2] = Math.cos(th) * r;
      bSeed[i] = Math.random(); bR[i] = r;
    }
    const gBurb = this.track(new BufferGeometry());
    gBurb.setAttribute("position", new BufferAttribute(bPos, 3));
    gBurb.setAttribute("aSeed", new BufferAttribute(bSeed, 1));
    gBurb.setAttribute("aR", new BufferAttribute(bR, 1));
    this.burbujas = new Points(gBurb, this.track(new ShaderMaterial({
      vertexShader: burbujaVS, fragmentShader: burbujaFS, transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uPR: { value: this.renderer.getPixelRatio() }, uOpacity: { value: 0.5 } }
    })));
    this.burbujas.renderOrder = 2;

    /* Corcho de madera */
    const aniso = this.renderer.capabilities.getMaxAnisotropy();
    const lienzo = (cv: HTMLCanvasElement, color = true) => {
      const t = this.track(new CanvasTexture(cv));
      if (color) t.colorSpace = SRGBColorSpace;
      t.anisotropy = aniso;
      return t;
    };
    const mCorcho = this.track(new MeshStandardMaterial({ map: lienzo(texturaCorcho()), roughness: 0.82, metalness: 0, envMapIntensity: 0.8 }));
    const gCorcho = this.track(new CylinderGeometry(0.222, 0.215, 0.24, 64, 1));
    const corcho = new Mesh(gCorcho, mCorcho);
    corcho.position.y = 2.45;
    // borde superior levemente redondeado
    const gCanto = this.track(new TorusGeometry(0.212, 0.012, 10, 64));
    const canto = new Mesh(gCanto, mCorcho);
    canto.rotation.x = Math.PI / 2;
    canto.position.y = 2.568;

    /* Cinta negra que cruza el corcho y baja por el cuello (sello), con remate plateado arriba */
    const mNegro = this.track(new MeshPhysicalMaterial({ color: "#121010", roughness: 0.32, metalness: 0.2, clearcoat: 0.8, envMapIntensity: 1.2 }));
    const mPlata = this.track(new MeshStandardMaterial({ color: "#d9d6cf", roughness: 0.3, metalness: 1, envMapIntensity: 1.5 }));
    const anchoCinta = 0.62; // radianes
    const gCintaCorcho = this.track(new CylinderGeometry(0.226, 0.219, 0.24, 24, 1, true, -anchoCinta / 2, anchoCinta));
    const cintaCorcho = new Mesh(gCintaCorcho, mNegro);
    cintaCorcho.position.y = 2.45;
    const gCintaCuello = this.track(new CylinderGeometry(0.222, 0.236, 0.15, 24, 1, true, -anchoCinta / 2 * 1.1, anchoCinta * 1.1));
    const cintaCuello = new Mesh(gCintaCuello, mNegro);
    cintaCuello.position.y = 2.27;
    const gTope = this.track(new BoxGeometry(0.14, 0.008, 0.452));
    const tope = new Mesh(gTope, mPlata);
    tope.position.y = 2.574;
    tope.rotation.y = Math.PI / 2;
    const gTopeN = this.track(new BoxGeometry(0.135, 0.006, 0.08));
    const topeN = new Mesh(gTopeN, mNegro);
    topeN.position.set(0, 2.573, 0.19);

    /* Anillo fino con la franja de 5 colores de la marca, bajo el corcho */
    const tFranja = lienzo(texturaFranja());
    tFranja.wrapS = RepeatWrapping;
    tFranja.repeat.set(3, 1);
    const gCollar = this.track(new CylinderGeometry(0.2, 0.2, 0.026, 64, 1, true));
    const collar = new Mesh(gCollar, this.track(new MeshStandardMaterial({ map: tFranja, roughness: 0.45, metalness: 0.1 })));
    collar.position.y = 2.318;

    /* Etiqueta frontal: tronco de cono que calza con la parte lisa del cuerpo */
    const pegar = 0.007;
    const y0 = 0.3, y1 = 1.08;
    const arco = 1.8;
    const gEtiq = this.track(new CylinderGeometry(radioEn(pVidrio, y1) + pegar, radioEn(pVidrio, y0) + pegar, y1 - y0, 96, 1, true, -arco / 2, arco));
    const etiqueta = new Mesh(gEtiq, this.track(new MeshStandardMaterial({
      map: lienzo(texturaEtiqueta(logo, false)), metalnessMap: lienzo(texturaEtiqueta(null, true), false),
      metalness: 1, roughness: 0.4, envMapIntensity: 1.5
    })));
    etiqueta.position.y = (y0 + y1) / 2;

    /* Contraetiqueta */
    const yb0 = 0.38, yb1 = 0.98, arcoB = 1.5;
    const gCon = this.track(new CylinderGeometry(radioEn(pVidrio, yb1) + pegar, radioEn(pVidrio, yb0) + pegar, yb1 - yb0, 96, 1, true, Math.PI - arcoB / 2, arcoB));
    const contra = new Mesh(gCon, this.track(new MeshStandardMaterial({
      map: lienzo(texturaContraetiqueta(false)), metalnessMap: lienzo(texturaContraetiqueta(true), false),
      metalness: 1, roughness: 0.45, envMapIntensity: 1.4
    })));
    contra.position.y = (yb0 + yb1) / 2;

    this.botella.add(
      base, liquido, this.burbujas, etiqueta, contra, collar,
      corcho, canto, cintaCorcho, cintaCuello, tope, topeN, vidrio, borde
    );

    /* Sombra suave sobre la mesa (fuera del pivote para que no se incline) */
    const gPiso = this.track(new PlaneGeometry(2.4, 2.4));
    this.sombra = new Mesh(gPiso, this.track(new MeshStandardMaterial({ map: lienzo(texturaSombra()), transparent: true, depthWrite: false, opacity: 0.8 })));
    this.sombra.rotation.x = -Math.PI / 2;
    this.scene.add(this.sombra);

    /* Luz que atraviesa el licor y tiñe la mesa */
    this.charco = new Mesh(this.track(new PlaneGeometry(2.2, 1.3)), this.track(new ShaderMaterial({
      transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: { uMap: { value: lienzo(texturaCharco(), false) }, uColor: { value: new Color(L0.light) }, uI: { value: 0.5 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: "uniform sampler2D uMap; uniform vec3 uColor; uniform float uI; varying vec2 vUv; void main(){ float a = texture2D(uMap, vUv).a; gl_FragColor = vec4(uColor * a * uI, a * uI); }"
    })));
    this.charco.rotation.x = -Math.PI / 2;
    this.scene.add(this.charco);

    /* Polvo dorado */
    const n = this.opts.movil ? 220 : 520;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 11;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 7;
      pos[i * 3 + 2] = -4.5 + Math.random() * 6;
      seed[i] = Math.random();
    }
    const gPolvo = this.track(new BufferGeometry());
    gPolvo.setAttribute("position", new BufferAttribute(pos, 3));
    gPolvo.setAttribute("aSeed", new BufferAttribute(seed, 1));
    this.polvo = new Points(gPolvo, this.track(new ShaderMaterial({
      vertexShader: polvoVS, fragmentShader: polvoFS, transparent: true, depthWrite: false, blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 }, uSize: { value: 24 }, uPR: { value: this.renderer.getPixelRatio() },
        uColor: { value: new Color("#f3cf86") }, uOpacity: { value: 0.6 }
      }
    })));
    this.scene.add(this.polvo);

    /* Luces: principal cálida + dos contraluces que cambian con el destilado */
    const key = new DirectionalLight("#fff1dc", 2.2);
    key.position.set(-3, 4, 5);
    const relleno = new DirectionalLight("#ffd9a8", 0.6);
    relleno.position.set(3, -1, 4);
    this.rimA.position.set(-2.4, 1.4, -1.8);
    this.rimB.position.set(2.4, 0.4, -1.6);
    this.scene.add(key, relleno, this.rimA, this.rimB);
  }

  private onPointer = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    this.puntero.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  };

  /** Alto (px) del header fijo que tapa la parte superior del lienzo */
  setChrome(px: number) {
    this.chrome = px;
    this.resize();
  }

  resize() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // encuadre: la botella ocupa ~64 % del alto visible (debajo del header) y nunca más de ~42 % del ancho
    const util = Math.max(1, h - this.chrome);
    const tan = Math.tan((this.camera.fov * Math.PI) / 360);
    const porAlto = (ALTO * h) / (0.64 * util);
    const porAncho = 1.18 / 0.42 / this.camera.aspect;
    this.camera.position.z = Math.max(porAlto, porAncho) / (2 * tan);
    // el centro óptico baja medio header para que la botella quede centrada en la zona visible
    this.camera.setViewOffset(w, h, 0, -this.chrome / 2, w, h);
    this.camera.updateProjectionMatrix();
    if (!this.activo) this.renderer.render(this.scene, this.camera);
  }

  setActivo(v: boolean) {
    if (v === this.activo) return;
    this.activo = v;
    if (v) this.raf = requestAnimationFrame(this.loop);
    else cancelAnimationFrame(this.raf);
  }

  /** Dibuja un solo cuadro (para movimiento reducido) */
  renderUnaVez() {
    this.aplicarEstado(0);
    this.renderer.render(this.scene, this.camera);
  }

  private aplicarEstado(t: number) {
    const s = this.state;
    // flotación sutil + paralaje del puntero
    this.punteroSuave.lerp(this.puntero, 0.05);
    const flota = Math.sin(t * 0.9) * 0.035;
    this.pivot.position.set(s.x + this.punteroSuave.x * 0.06, s.y + flota, 0);
    this.pivot.rotation.set(this.punteroSuave.y * 0.05, s.rotY + this.punteroSuave.x * 0.12, s.tilt);
    this.pivot.scale.setScalar(s.scale);
    const piso = (-ALTO / 2) * s.scale + s.y - 0.01;
    this.sombra.position.set(s.x, piso, 0);
    this.sombra.scale.setScalar(s.scale * (1 - flota * 0.8));
    (this.sombra.material as MeshStandardMaterial).opacity = 0.8 - Math.abs(s.tilt) * 0.8;
    this.charco.position.set(s.x + 0.15 * s.scale, piso + 0.005, 0.75 * s.scale);
    this.charco.scale.setScalar(s.scale);

    // líquido: mezcla entre los dos destilados vecinos
    const k = Math.max(0, Math.min(LICORES.length - 1, s.liquid));
    const i0 = Math.floor(k), i1 = Math.min(LICORES.length - 1, i0 + 1), f = k - i0;
    const A = LICORES[i0], B = LICORES[i1];
    const u = this.liquido.uniforms;
    mezclar(this.tmpA.set(A.deep), this.tmpB.set(B.deep), f, u.uDeep.value);
    mezclar(this.tmpA.set(A.light), this.tmpB.set(B.light), f, u.uLight.value);
    u.uAlpha.value = A.alpha + (B.alpha - A.alpha) * f;
    u.uTime.value = t;
    const bu = (this.burbujas.material as ShaderMaterial).uniforms;
    bu.uTime.value = t;
    bu.uOpacity.value = 0.25 + (1 - u.uAlpha.value) * 0.7;
    const cm = (this.charco.material as ShaderMaterial).uniforms;
    cm.uColor.value.copy(u.uLight.value);
    cm.uI.value = 0.22 + 0.25 * u.uAlpha.value;

    // contraluces con el color del destilado
    mezclar(this.tmpA.set(AMBIENTE[i0]), this.tmpB.set(AMBIENTE[i1]), f, this.rimA.color);
    this.rimB.color.copy(this.rimA.color).offsetHSL(-0.04, 0.1, -0.05);

    const pm = this.polvo.material as ShaderMaterial;
    pm.uniforms.uTime.value = t;
    pm.uniforms.uOpacity.value = s.dust;
    this.polvo.rotation.y = s.rotY * 0.06;
  }

  private loop = (now: number) => {
    if (!this.activo) return;
    const t = (now - this.t0) / 1000;
    this.aplicarEstado(t);
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.loop);
  };

  dispose() {
    this.setActivo(false);
    this.ro?.disconnect();
    window.removeEventListener("pointermove", this.onPointer);
    this.scene.traverse((o) => {
      const m = (o as Mesh).material as Material | Material[] | undefined;
      if (Array.isArray(m)) m.forEach((x) => x.dispose());
      else m?.dispose();
    });
    this.desechables.forEach((d) => d.dispose());
    (this.scene.environment as Texture | null)?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}
