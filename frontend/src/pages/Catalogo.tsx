import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { data } from "@/data/data";
import { useCart } from "@/context/CartContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cat } from "@/lib/catalogo";
import { gradVarsTexto, type CSSVars } from "@/lib/colores";
import { norm } from "@/lib/format";
import { wa } from "@/lib/whatsapp";
import type { Producto } from "@/types";
import { ProductCard } from "@/components/product/ProductCard";
import { Icon } from "@/components/ui/Icon";

type Orden = "relevancia" | "precio-asc" | "precio-desc" | "nombre";
type Rango = "todos" | "ofertas" | "economico" | "medio" | "premium";

const FILTROS: Record<string, string> = { ofertas: "Ofertas", nuevos: "Nuevos", regalo: "Para regalar" };
const PAGINA = 24;
const RANGOS: [Rango, string][] = [
  ["todos", "Todos los precios"],
  ["ofertas", "Solo ofertas"],
  ["economico", "Hasta $60.000"],
  ["medio", "$60.000 – $200.000"],
  ["premium", "Premium (más de $200.000)"]
];

function filtrar(o: { q: string; catId: string; subId: string; filtroExtra: string; rango: Rango; orden: Orden; pv: (p: Producto) => number }): Producto[] {
  const terms = norm(o.q).split(/\s+/).filter(Boolean);
  let items = data.productos.filter((p) => (!o.catId || p.categoria === o.catId) && (!o.subId || p.sub === o.subId));
  if (o.filtroExtra === "ofertas") items = items.filter((p) => p.antes);
  if (o.filtroExtra === "nuevos") items = items.filter((p) => p.badge === "Nuevo");
  if (o.filtroExtra === "regalo") items = items.filter((p) => p.badge === "Premium" || p.destacado);
  if (terms.length) {
    items = items
      .map((p) => {
        const txt = norm(p.nombre + " " + p.presentacion + " " + (cat(p.categoria)?.nombre || "") + " " + (p.arte?.etiqueta || ""));
        return { p, s: terms.reduce((s, t) => s + (txt.indexOf(t) > -1 ? 1 : -10), 0) };
      })
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.p);
  }
  if (o.rango === "ofertas") items = items.filter((p) => p.antes);
  if (o.rango === "economico") items = items.filter((p) => o.pv(p) < 60000);
  if (o.rango === "medio") items = items.filter((p) => o.pv(p) >= 60000 && o.pv(p) < 200000);
  if (o.rango === "premium") items = items.filter((p) => o.pv(p) >= 200000);
  if (o.orden === "precio-asc") items = items.slice().sort((a, b) => o.pv(a) - o.pv(b));
  if (o.orden === "precio-desc") items = items.slice().sort((a, b) => o.pv(b) - o.pv(a));
  if (o.orden === "nombre") items = items.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return items;
}

export default function Catalogo() {
  const { precioLista } = useCart();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const catId = params.get("categoria") || "";
  const subId = params.get("sub") || "";
  const filtroExtra = params.get("filtro") || "";
  const [orden, setOrden] = useState<Orden>("relevancia");
  const [rango, setRango] = useState<Rango>("todos");
  const [limite, setLimite] = useState(PAGINA);
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const headRef = useRef<HTMLDivElement>(null);

  useEffect(() => setLimite(PAGINA), [q, catId, subId, filtroExtra]);

  const c = cat(catId);
  const subObj = c && subId ? (c.subs || []).find((s) => s.id === subId) : undefined;
  const items = useMemo(() => filtrar({ q, catId, subId, filtroExtra, rango, orden, pv: precioLista }), [q, catId, subId, filtroExtra, rango, orden, precioLista]);

  usePageTitle((c ? c.nombre : q ? "Buscar: " + q : "Catálogo") + " · Licores Palmira");

  const titulo = c
    ? c.nombre + (subObj ? " · " + subObj.nombre : "")
    : filtroExtra && FILTROS[filtroExtra]
      ? FILTROS[filtroExtra]
      : q
        ? "Resultados para “" + q + "”"
        : "Catálogo completo";
  const colCab = c ? c.color : filtroExtra === "ofertas" ? "#ef1c25" : "#2a2a2d";
  const headStyle: CSSVars = { "--cat-color": colCab, ...gradVarsTexto(colCab) };

  /** Cambia parámetros de la URL sin recargar (equivale al history.replaceState original) */
  const setUrl = (cambios: Record<string, string>) => {
    const u = new URLSearchParams(params);
    Object.entries(cambios).forEach(([k, v]) => (v ? u.set(k, v) : u.delete(k)));
    setParams(u, { replace: true });
  };

  const elegirCategoria = (id: string) => {
    setUrl({ categoria: id, sub: "" });
    setFiltrosOpen(false);
    const top = (headRef.current?.offsetTop || 0) - 80;
    window.scrollTo({ top, behavior: "smooth" });
  };

  const conteo = (id: string) => data.productos.filter((p) => p.categoria === id).length;

  return (
    <main>
      <div className="page-head page-head--cat" ref={headRef} style={headStyle}>
        <div className="contenedor">
          <nav className="breadcrumb" aria-label="Ruta">
            <Link to="/">Inicio</Link>
            <Icon name="chevron-right" size={14} wrap />
            <span>Catálogo</span>
          </nav>
          <div className="seccion-head" style={{ marginBottom: 0 }}>
            <div className="seccion-title">
              <div className="seccion-title__kicker">Tienda</div>
              <h1 className="seccion-title__h">{titulo}</h1>
              <p>
                {c
                  ? c.texto + " " + c.cantidad + " referencias en tienda; aquí ves una selección. ¿No encuentras algo? Pregúntanos por WhatsApp."
                  : "Más de 2.000 referencias en tienda. Esta es una selección de las más pedidas; cualquier otra te la cotizamos por WhatsApp."}
              </p>
            </div>
            <button className="btn btn--outline btn--sm filtros__toggle" type="button" onClick={() => setFiltrosOpen((v) => !v)}>
              <Icon name="sliders-horizontal" size={16} wrap />
              Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="contenedor catalogo">
        <aside className={"filtros" + (filtrosOpen ? " is-open" : "")} aria-label="Filtros">
          <div className="filtros__box">
            <h4><Icon name="layout-grid" size={16} wrap />Categorías</h4>
            <div>
              <button className={"filtros__cat" + (!catId ? " is-active" : "")} type="button" onClick={() => elegirCategoria("")}>
                <Icon name="layout-grid" size={18} />
                Todas <small>{data.productos.length}</small>
              </button>
              {data.categorias.map((k) => (
                <button
                  key={k.id}
                  className={"filtros__cat" + (catId === k.id ? " is-active" : "")}
                  type="button"
                  style={{ "--cat-color": k.color } as CSSVars}
                  onClick={() => elegirCategoria(k.id)}
                >
                  <Icon name={k.icono} size={18} />
                  {k.corto}
                  <small>{conteo(k.id)}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="filtros__box">
            <h4><Icon name="badge-percent" size={16} wrap />Precio</h4>
            <div className="filtros__range">
              {RANGOS.map(([v, label]) => (
                <label key={v}>
                  <input
                    type="radio"
                    name="rango"
                    value={v}
                    checked={rango === v}
                    onChange={() => {
                      setRango(v);
                      setLimite(PAGINA);
                    }}
                  />{" "}
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="filtros__box" style={{ background: "var(--negro)", color: "#fff", borderColor: "transparent" }}>
            <h4 style={{ color: "#fff" }}><Icon name="whatsapp" size={16} wrap />¿No lo encuentras?</h4>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.8)" }}>Tenemos más de 2.000 referencias en bodega. Escríbenos y te lo cotizamos.</p>
            <a className="btn btn--wa btn--sm btn--block" style={{ marginTop: 12 }} href={wa("pedido", "Hola Licores Palmira, busco un producto que no veo en la web.")} target="_blank" rel="noopener">
              Preguntar por WhatsApp
            </a>
          </div>
        </aside>

        <div>
          <div className="catalogo__toolbar">
            <div className="catalogo__count"><b>{items.length}</b> {items.length === 1 ? "producto" : "productos"}</div>
            <label className="select">
              <Icon name="sliders-horizontal" size={16} wrap />
              <span className="sr-only">Ordenar</span>
              <select value={orden} onChange={(e) => setOrden(e.target.value as Orden)}>
                <option value="relevancia">Relevancia</option>
                <option value="precio-asc">Precio: menor a mayor</option>
                <option value="precio-desc">Precio: mayor a menor</option>
                <option value="nombre">Nombre A–Z</option>
              </select>
            </label>
          </div>
          <div className="catalogo__subs">
            {c && (c.subs || []).length > 0 && (
              <>
                <a className={"subchip" + (!subId ? " is-active" : "")} href={"/catalogo?categoria=" + c.id} onClick={(e) => { e.preventDefault(); setUrl({ sub: "" }); }}>
                  Todo {c.corto}
                </a>
                {(c.subs || []).map((s) => {
                  const n = data.productos.filter((p) => p.categoria === c.id && p.sub === s.id).length;
                  return n ? (
                    <a key={s.id} className={"subchip" + (subId === s.id ? " is-active" : "")} href={"/catalogo?categoria=" + c.id + "&sub=" + s.id} onClick={(e) => { e.preventDefault(); setUrl({ sub: s.id }); }}>
                      {s.nombre} <small>{n}</small>
                    </a>
                  ) : null;
                })}
              </>
            )}
          </div>
          <div className="catalogo__chips">
            {c && (
              <Link className="chip" to={"/catalogo" + (q ? "?q=" + encodeURIComponent(q) : "")}>
                {c.corto} <Icon name="x" size={13} />
              </Link>
            )}
            {q && (
              <Link className="chip" to={"/catalogo" + (catId ? "?categoria=" + catId : "")}>
                “{q}” <Icon name="x" size={13} />
              </Link>
            )}
          </div>
          <div className="product-grid">
            {items.length ? (
              items.slice(0, limite).map((p) => <ProductCard key={p.id} p={p} />)
            ) : (
              <div className="catalogo__empty" style={{ gridColumn: "1/-1" }}>
                <Icon name="search" size={44} strokeWidth={1.4} />
                <b>No encontramos productos con ese filtro</b>
                <span>Prueba otra palabra, otra categoría, o pregúntanos: tenemos más de 2.000 referencias.</span>
                <a className="btn btn--wa" href={wa("pedido", "Hola, busco: " + (q || c?.nombre || ""))} target="_blank" rel="noopener">
                  <Icon name="whatsapp" size={18} />
                  Preguntar por WhatsApp
                </a>
              </div>
            )}
          </div>
          <div className="catalogo__more">
            <button className="btn btn--outline btn--lg" type="button" hidden={items.length <= limite} onClick={() => setLimite((l) => l + PAGINA)}>
              Cargar más productos
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
