/* Lectura/escritura segura en localStorage (JSON). Nunca lanza errores. */
export const KEYS = {
  carrito: "lp_carrito",
  mayorista: "lp_mayorista",
  pautaStats: "lp_pauta_stats",
  pautaVistos: "lp_pauta_vistos"
} as const;

export function readStore<T>(key: string): T | null {
  try {
    const r = localStorage.getItem(key);
    return r ? (JSON.parse(r) as T) : null;
  } catch {
    return null;
  }
}

export function writeStore(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function removeStore(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* almacenamiento no disponible */
  }
}
