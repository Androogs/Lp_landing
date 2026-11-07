/* ============================================================
   LICORES PALMIRA · Tipos del dominio
   Si agregas un campo nuevo en src/data/data.ts, decláralo aquí.
   ============================================================ */

export type Stock = "disponible" | "pocas" | "agotado";
export type BadgeTipo = "Oferta" | "Nuevo" | "Más vendido" | "Premium" | "Regalo";

export type FormaBotella =
  | "whisky" | "ron" | "aguardiente" | "tequila" | "vodka" | "ginebra" | "vino" | "espumoso"
  | "cerveza" | "crema" | "brandy" | "licor" | "garrafa" | "gaseosa" | "lata" | "bolsa" | "caja";

export interface ArteBotella {
  forma?: FormaBotella;
  liquido?: string;
  etiqueta?: string;
  sub?: string;
  acento?: string;
}

export interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  presentacion: string;
  detal: number;
  mayor: number;
  /** Precio anterior (se llena automáticamente cuando el producto está en `ofertas`) */
  antes?: number;
  badge?: BadgeTipo;
  stock?: Stock;
  imagen?: string;
  arte?: ArteBotella;
  masBuscado?: boolean;
  destacado?: boolean;
  /** Subcategoría (se asigna con SUB_PRODUCTO) */
  sub?: string;
  /** Preset de fondo de tarjeta (se asigna con FONDO_PRODUCTO) */
  fondo?: string;
}

export interface Subcategoria { id: string; nombre: string }

export interface Categoria {
  id: string;
  nombre: string;
  corto: string;
  icono: string;
  imagen: string;
  color: string;
  cantidad: number;
  texto: string;
  ocultoEnInicio?: boolean;
  subs?: Subcategoria[];
}

export interface Marca {
  nombre: string;
  razon: string;
  eslogan: string;
  lema: string;
  fundacion: number;
  telefono: string;
  telefonoIntl: string;
  whatsapp: string;
  email: string;
  direccion: string;
  barrio: string;
  ciudad: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  minimoMayor: number;
  /** Unidades totales mínimas para comprar en modo mayorista */
  minimoPedidoMayor: number;
  mensajeWhatsApp: string;
  googleResenas: string;
  googleCalificacion: string;
  googleTotal: number;
  /** NIT de la empresa (aparece en la Política de Tratamiento de Datos). Completar antes de publicar. */
  nit?: string;
}

export interface Beneficio { icono: string; color: string; titulo: string; texto: string; mas?: string; href?: string; cta?: string }

export interface Sede {
  id: string; nombre: string; tipo: string; direccion: string; ciudad: string; telefono: string; horario: string;
  color: string; principal?: boolean; mapa: string; comoLlegar: string;
}

export interface Experiencia {
  id: string; kicker?: string; titulo: string; texto: string; cta: string; href: string;
  arte?: string; imagen?: string; productos?: string[]; c1?: string; c2?: string; c3?: string;
  icono?: string; ancho?: boolean; logo?: boolean; logoBadge?: boolean; color?: string;
}

export interface Cifra { valor: number; etiqueta: string; formato?: "anio"; prefijo?: string; sufijo?: string; icono?: string; color?: string }

export interface Cta { texto: string; href: string }
export interface Slide { kicker: string; titulo: string; texto: string; cta: Cta; cta2?: Cta; imagen: string; imagenMovil?: string; pos?: string }

export interface Faq { q: string; a: string }

export type TipoBanner = "propio" | "patrocinado" | "poster";

export interface Banner {
  id: string;
  tipo?: TipoBanner;
  marca: string;
  titulo?: string;
  href?: string;
  imagen?: string;
  imagenMd?: string;
  kicker?: string;
  texto?: string;
  cta?: string;
  producto?: string;
  productos?: string[];
  color?: string;
  color2?: string;
  fondo?: string;
  vigencia?: { desde?: string; hasta?: string };
  /* Cartel compuesto (tipo "poster") */
  propio?: boolean;
  lineas?: string[];
  destaque?: string;
  etiqueta?: string;
  precio?: string;
  nota?: string;
  c1?: string;
  c2?: string;
  acento?: string;
}

export interface EspacioPauta { id: string; nombre: string; formato: string; precio: number; texto: string; top?: boolean }

export interface Pauta {
  webhook?: string;
  informeUrl?: string;
  rotacionSeg?: number;
  espacios: EspacioPauta[];
  banners: Banner[];
  menu?: Record<string, Banner>;
}

export interface EventoCalc { id: string; nombre: string; factor: number }
export interface IntensidadCalc { id: string; nombre: string; factor: number; texto: string }
export interface LicorCalc { id: string; nombre: string; categoria: string; icono: string; porUnidad?: boolean; mlTrago?: number; sugerido: string; mezclador?: string }

export interface Calculadora {
  eventos: EventoCalc[];
  intensidades: IntensidadCalc[];
  licores: LicorCalc[];
  seleccionInicial: string[];
  extras: {
    aguaPorPersona: number; aguaProducto: string; snackCadaPersonas: number; snackProducto: string;
    hieloKgPorPersona: number; vasosPorPersona: number; mezclaPartes: number;
  };
}

export interface MenuGrupo { id: string; nombre: string; categorias: string[] }

export interface Seleccion {
  slot: number; id: string; arte?: string; fondo?: string; tipo: "propio" | "patrocinado"; marca: string; kicker?: string; rank?: number;
  texto: string; frase?: string; producto: string; c1?: string; c2?: string; c3?: string; href: string;
}

export interface Resena { nombre: string; lugar: string; estrellas: number; texto: string; fecha: string }

export interface MarcaLogo { nombre: string; logo?: string; chico?: boolean; logoAncho?: number }

export interface Mayoristas { asesorWhatsApp: string }

export interface StoreData {
  marca: Marca;
  categorias: Categoria[];
  productos: Producto[];
  marcas: MarcaLogo[];
  beneficios: Beneficio[];
  sedes: Sede[];
  experiencias: Experiencia[];
  cifras: Cifra[];
  valores: string[];
  slides: Slide[];
  faqs: Faq[];
  pauta: Pauta;
  calculadora: Calculadora;
  menu: MenuGrupo[];
  seleccion: Seleccion[];
  resenas: Resena[];
  mayoristas: Mayoristas;
  busquedasPopulares: string[];
}

export interface Coctel { nombre: string; receta: string }
export interface Ficha {
  intro?: string;
  caracteristicas?: string;
  alcohol?: string;
  ocasion?: string;
  formatos?: string;
  servicio?: string;
  procedencia?: string;
  cocteles?: Coctel[];
}

export interface CartItem { id: string; qty: number }
export interface SesionMayorista { usuario: string; nombre: string; rol: "mayorista" | "admin" }
/** Modo de precios elegido en la puerta de entrada ("¿Regular o mayorista?") */
export type ModoPrecio = "regular" | "mayorista";
