import { data } from "@/data/data";
import type { Banner, Categoria, Producto } from "@/types";

const PRODUCTOS_POR_ID = new Map(data.productos.map((p) => [p.id, p]));
const CATEGORIAS_POR_ID = new Map(data.categorias.map((c) => [c.id, c]));

export function producto(id: string | null | undefined): Producto | undefined {
  return id ? PRODUCTOS_POR_ID.get(id) : undefined;
}

export function cat(id: string | null | undefined): Categoria | undefined {
  return id ? CATEGORIAS_POR_ID.get(id) : undefined;
}

export function prods(ids: string[] | undefined): Producto[] {
  return (ids || []).map((id) => PRODUCTOS_POR_ID.get(id)).filter((p): p is Producto => !!p);
}

export function bannerVigente(b: Banner): boolean {
  if (!b.vigencia) return true;
  const hoy = new Date().toISOString().slice(0, 10);
  return (!b.vigencia.desde || hoy >= b.vigencia.desde) && (!b.vigencia.hasta || hoy <= b.vigencia.hasta);
}

export function bannersActivos(): Banner[] {
  return (data.pauta.banners || []).filter(bannerVigente);
}
