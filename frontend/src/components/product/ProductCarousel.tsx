import type { Producto } from "@/types";
import { Carousel } from "./Carousel";
import { ProductCard } from "./ProductCard";

export function ProductCarousel({ items, id }: { items: Producto[]; id?: string }) {
  return (
    <Carousel id={id} trackClassName="carrusel__track carrusel__track--productos" itemsKey={items.map((p) => p.id).join(",")}>
      {items.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </Carousel>
  );
}
