import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { data } from "@/data/data";
import { usePageTitle } from "@/hooks/usePageTitle";
import { producto } from "@/lib/catalogo";
import { track } from "@/lib/tracking";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { ProductDetail } from "@/components/product/ProductDetail";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

export default function Producto() {
  const { id } = useParams();
  const p = producto(id) || data.productos[0];
  usePageTitle(p.nombre + " " + p.presentacion + " · Licores Palmira");
  useEffect(() => track("imp", "ficha-" + p.id), [p.id]);
  const relacionados = data.productos.filter((x) => x.categoria === p.categoria && x.id !== p.id).slice(0, 10);

  return (
    <main>
      <div className="contenedor page-head">
        <nav className="breadcrumb" aria-label="Ruta">
          <Link to="/">Inicio</Link>
          <Icon name="chevron-right" size={14} wrap />
          <Link to="/catalogo">Catálogo</Link>
          <Icon name="chevron-right" size={14} wrap />
          <span>{p.nombre}</span>
        </nav>
      </div>
      <div className="contenedor">
        <ProductDetail key={p.id} p={p} />
      </div>
      <section className="seccion seccion--alt">
        <div className="contenedor">
          <Reveal className="seccion-head">
            <div className="seccion-title">
              <div className="seccion-title__kicker">También te puede gustar</div>
              <h2>De la misma categoría</h2>
            </div>
          </Reveal>
          <ProductCarousel id="car-rel" items={relacionados} />
        </div>
      </section>
    </main>
  );
}
