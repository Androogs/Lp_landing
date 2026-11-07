import { useState } from "react";
import { Link } from "react-router-dom";
import { data } from "@/data/data";
import { fichaDe } from "@/data/fichas";
import { useCart } from "@/context/CartContext";
import { useUI } from "@/context/UIContext";
import { cat } from "@/lib/catalogo";
import { precio } from "@/lib/format";
import { wa } from "@/lib/whatsapp";
import type { Producto } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { ProductMedia } from "@/components/ui/ProductMedia";
import { Qty } from "@/components/ui/Qty";

/** Ficha de producto (modal y página /producto/:id) */
export function ProductDetail({ p, modal = false }: { p: Producto; modal?: boolean }) {
  const { add, esMayor, precioLista } = useCart();
  const { closeProduct, openCart } = useUI();
  const [qty, setQty] = useState(1);
  const f = fichaDe(p);
  const c = cat(p.categoria);
  const pv = precioLista(p);
  const datos: [string, string | undefined][] = [
    ["Características", f.caracteristicas],
    ["Grado de alcohol", f.alcohol],
    ["Ocasión de consumo", f.ocasion],
    ["Formatos", f.formatos],
    ["Servicio sugerido", f.servicio],
    ["Procedencia", f.procedencia]
  ];

  const onAdd = () => {
    add(p.id, qty);
    closeProduct();
    openCart();
  };

  return (
    <div className={"pd" + (modal ? " pd--modal" : "")} data-product={p.id}>
      <div className="pd__media">
        <div className="product-card__badges">{p.badge && <Badge tipo={p.badge} />}</div>
        <ProductMedia p={p} />
      </div>
      <div className="pd__info">
        <div className="product-card__cat">
          {c ? c.nombre : ""}
          {f.procedencia && f.procedencia !== "—" ? " · " + f.procedencia : ""}
        </div>
        <h2 className="pd__name">{p.nombre}</h2>
        <div className="pd__pres">
          {p.presentacion}
          {f.alcohol ? " · " + f.alcohol : ""} · <span className={"stock stock--" + (p.stock || "disponible")}>Disponible</span>
        </div>
        <p className="pd__intro">{f.intro || ""}</p>
        <div className="pd__price">
          <span className="price">{precio(pv)}</span>
          {esMayor
            ? pv < p.detal ? <span className="price price--old">{precio(p.detal)}</span> : null
            : p.antes ? <span className="price price--old">{precio(p.antes)}</span> : null}
          <span className="price--mayor">
            {esMayor ? (
              <>
                <Icon name="badge-percent" size={14} />
                Precio al por mayor
              </>
            ) : (
              <>
                <Icon name="badge-percent" size={14} />
                Al por mayor {precio(p.mayor)} <small>(desde {data.marca.minimoMayor} und)</small>
              </>
            )}
          </span>
        </div>
        <div className="pd__actions">
          <Qty value={qty} onChange={setQty} />
          <button className="btn btn--rojo btn--lg" type="button" onClick={onAdd}>
            <Icon name="shopping-cart" size={18} />
            Añadir al carrito
          </button>
          <a
            className="btn btn--wa btn--lg"
            href={wa("pedido", "Hola Licores Palmira, me interesa " + p.nombre + " " + p.presentacion + " (" + precio(pv) + ").")}
            target="_blank"
            rel="noopener"
          >
            <Icon name="whatsapp" size={18} />
            Preguntar
          </a>
          {modal && (
            <Link className="btn btn--outline" to={"/producto/" + p.id} onClick={closeProduct}>
              Ficha completa
            </Link>
          )}
        </div>
        <dl className="pd__ficha">
          {datos
            .filter((x) => x[1])
            .map(([dt, dd]) => (
              <div key={dt}>
                <dt>{dt}</dt>
                <dd>{dd}</dd>
              </div>
            ))}
        </dl>
        {f.cocteles && f.cocteles.length > 0 && (
          <div className="pd__cocteles">
            <h3>
              <Icon name="martini" size={18} />
              Ideas para servirlo
            </h3>
            <div className="pd__cocteles-grid">
              {f.cocteles.map((k) => (
                <div className="coctel" key={k.nombre}>
                  <b>{k.nombre}</b>
                  <p>{k.receta}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
