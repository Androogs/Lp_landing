/** Precio en pesos colombianos: 177500 → "$177.500" */
export function precio(n: number): string {
  return "$" + Math.round(n).toLocaleString("es-CO");
}

/** Normaliza texto para búsquedas: minúsculas y sin tildes */
export function norm(s: unknown): string {
  return String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Obtiene los ml de una presentación ("750 ml", "1 L"); 750 por defecto */
export function mlDe(pres: string | undefined): number {
  const m = String(pres || "").match(/([\d.,]+)\s*(ml|l)\b/i);
  if (!m) return 750;
  const n = parseFloat(m[1].replace(",", "."));
  return m[2].toLowerCase() === "l" ? n * 1000 : n;
}
