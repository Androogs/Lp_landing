import { useEffect, useRef, useState, type MouseEvent } from "react";
import { data } from "@/data/data";
import { useCart } from "@/context/CartContext";
import { useUI } from "@/context/UIContext";
import { cat } from "@/lib/catalogo";
import { precio } from "@/lib/format";
import { wa } from "@/lib/whatsapp";
import type { Producto } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { ProductMedia } from "@/components/ui/ProductMedia";

const STOCK_TXT = { disponible: "Disponible", pocas: "Pocas unidades", agotado: "Agotado" } as const;

export function ProductCard({ p }: { p: Producto }) {
  const { add, esMayor, precioLista } = useCart();
  const { openProduct, showToast } = useUI();
  const [added, setAdded] = useState(false);
  const [fav, setFav] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const c = cat(p.categoria);
  const pv = precioLista(p);
  const pct = !esMayor && p.antes ? Math.round((1 - p.detal / p.antes) * 100) : 0;
  const stock = p.stock || "disponible";

  const abrir = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    e.preventDefault();
    openProduct(p.id);
  };
  const onAdd = () => {
    add(p.id, 1);
    setAdded(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAdded(false), 1400);
  };
  const onFav = () => {
    setFav((v) => {
      showToast(!v ? "Guardado en favoritos" : "Quitado de favoritos", "heart");
      return !v;
    });
  };

  return (
    <article className="product-card" data-product={p.id}>
      <div className="product-card__media" onClick={abrir}>
        <div className="product-card__badges">
          {p.badge && <Badge tipo={p.badge} />}
          {pct ? <span className="badge badge--pct">-{pct}%</span> : null}
        </div>
        <button className={"product-card__fav" + (fav ? " is-on" : "")} type="button" aria-label="Guardar en favoritos" onClick={onFav}>
          <Icon name="heart" size={17} />
        </button>
        <ProductMedia p={p} />
      </div>
      <div className="product-card__body">
        <span className="product-card__cat">{c ? c.corto : ""}</span>
        <h3 className="product-card__name" onClick={abrir}>{p.nombre}</h3>
        <div className="product-card__pres">
          {p.presentacion} · <span className={"stock stock--" + stock}>{STOCK_TXT[stock]}</span>
        </div>
        <div className="product-card__price">
          <span className="price">{precio(pv)}</span>
          {esMayor
            ? pv < p.detal ? <span className="price price--old">{precio(p.detal)}</span> : null
            : p.antes ? <span className="price price--old">{precio(p.antes)}</span> : null}
          <span className="price--mayor">
            {esMayor ? (
              <>
                <Icon name="badge-percent" size={13} />
                Precio al por mayor
              </>
            ) : (
              <>
                <Icon name="package" size={13} />
                Mayor {precio(p.mayor)} <small>(desde {data.marca.minimoMayor} und)</small>
              </>
            )}
          </span>
        </div>
        <div className="product-card__actions">
          <button className={"product-card__add" + (added ? " is-added" : "")} type="button" onClick={onAdd} disabled={stock === "agotado"}>
            <Icon name="shopping-cart" size={17} />
            <span>{added ? "¡Añadido!" : "Añadir"}</span>
          </button>
          <a
            className="product-card__wa"
            href={wa("pedido", "Hola Licores Palmira, me interesa: " + p.nombre + " " + p.presentacion + " (" + precio(pv) + ").")}
            target="_blank"
            rel="noopener"
            aria-label="Preguntar por WhatsApp"
            title="Preguntar por WhatsApp"
          >
            <Icon name="whatsapp" size={19} />
          </a>
        </div>
      </div>
    </article>
  );
}
