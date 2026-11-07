import type { Producto } from "@/types";
import { BottleArt } from "./BottleArt";

/** Foto real del producto o, si no hay, la ilustración SVG de la botella */
export function ProductMedia({ p, className }: { p: Producto; className?: string }) {
  if (p.imagen) return <img src={p.imagen} alt={p.nombre} loading="lazy" decoding="async" />;
  return <BottleArt arte={p.arte} className={className} />;
}
