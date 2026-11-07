import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { data } from "@/data/data";
import { useCart } from "@/context/CartContext";
import { cat } from "@/lib/catalogo";
import { escapeRegex, norm, precio } from "@/lib/format";
import { wa } from "@/lib/whatsapp";
import type { Categoria, Producto } from "@/types";
import { Icon } from "@/components/ui/Icon";
import { ProductMedia } from "@/components/ui/ProductMedia";

export const FOCUS_SEARCH_EVENT = "lp:focus-search";

function catsFor(q: string): Categoria[] {
  return data.categorias.filter((c) => norm(c.nombre + " " + c.corto + " " + c.texto).indexOf(q) > -1).slice(0, 3);
}

function prodsFor(q: string): Producto[] {
  const terms = q.split(/\s+/).filter(Boolean);
  return data.productos
    .map((p) => {
      const txt = norm(p.nombre + " " + p.presentacion + " " + (cat(p.categoria)?.nombre || "") + " " + (p.arte?.etiqueta || ""));
      const score = terms.reduce((s, t) => s + (txt.indexOf(t) > -1 ? (norm(p.nombre).indexOf(t) === 0 ? 3 : 1) : -10), 0);
      return { p, score: score + (p.masBuscado ? 0.5 : 0) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((x) => x.p);
}

/** Resalta los términos buscados con <mark> */
function Mark({ txt, q }: { txt: string; q: string }) {
  const terms = q.split(/\s+/).filter(Boolean);
  if (!terms.length) return <>{txt}</>;
  const re = new RegExp("(" + terms.map(escapeRegex).join("|") + ")", "ig");
  const parts = txt.split(re);
  return (
    <>
      {parts.map((part, i): ReactNode => (i % 2 === 1 ? <mark key={i}>{part}</mark> : part))}
    </>
  );
}

function CatItem({ c, q, active }: { c: Categoria; q?: string; active: boolean }) {
  return (
    <Link className={"search__item" + (active ? " is-active" : "")} to={"/catalogo?categoria=" + c.id}>
      <span className="search__item-cat" style={{ background: c.color }}>
        <Icon name={c.icono} size={18} />
      </span>
      <span className="search__item-main">
        <span className="search__item-title">{q ? <Mark txt={c.nombre} q={q} /> : c.nombre}</span>
        <span className="search__item-sub">{c.cantidad} productos</span>
      </span>
      <Icon name="chevron-right" size={16} />
    </Link>
  );
}

/** Buscador del header con resultados instantáneos y navegación por teclado */
export function SearchBar() {
  const { precioLista } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // En el catálogo, el buscador muestra la búsqueda actual (?q=)
  useEffect(() => {
    const q = new URLSearchParams(location.search).get("q");
    if (location.pathname === "/catalogo" && q) setValue(q);
    setOpen(false);
    setActive(-1);
  }, [location.pathname, location.search]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActive(-1);
      }
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  // Botón "Buscar" de la barra móvil
  useEffect(() => {
    const onFocus = () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.setTimeout(() => inputRef.current?.focus(), 300);
    };
    window.addEventListener(FOCUS_SEARCH_EVENT, onFocus);
    return () => window.removeEventListener(FOCUS_SEARCH_EVENT, onFocus);
  }, []);

  const q = norm(value.trim());
  const resultados = useMemo(() => (q ? { cats: catsFor(q), prods: prodsFor(q) } : null), [q]);
  // orden de los elementos navegables con flechas
  const navegables = useMemo(() => {
    if (!resultados) return data.categorias.slice(0, 6).map((c) => "/catalogo?categoria=" + c.id);
    const list = [
      ...resultados.cats.map((c) => "/catalogo?categoria=" + c.id),
      ...resultados.prods.map((p) => "/catalogo?q=" + encodeURIComponent(p.nombre))
    ];
    if (list.length) list.push("/catalogo?q=" + encodeURIComponent(value.trim()));
    return list;
  }, [resultados, value]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    navigate("/catalogo" + (value.trim() ? "?q=" + encodeURIComponent(value.trim()) : ""));
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const n = navegables.length;
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && n) {
      e.preventDefault();
      const next = (active + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
      setActive(next);
      const items = panelRef.current?.querySelectorAll(".search__item, .search__all");
      (items?.[next] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && active > -1 && navegables[active]) {
      e.preventDefault();
      navigate(navegables[active]);
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
      inputRef.current?.blur();
    }
  };

  let panel: ReactNode;
  if (!resultados) {
    panel = (
      <>
        <div className="search__group">
          <div className="search__label">Búsquedas populares</div>
          <div className="search__chips">
            {data.busquedasPopulares.map((b) => (
              <Link key={b} className="chip" to={"/catalogo?q=" + encodeURIComponent(b)}>
                <Icon name="search" size={13} />
                {b}
              </Link>
            ))}
          </div>
        </div>
        <div className="search__group">
          <div className="search__label">Categorías</div>
          {data.categorias.slice(0, 6).map((c, i) => (
            <CatItem key={c.id} c={c} active={active === i} />
          ))}
        </div>
      </>
    );
  } else if (!resultados.cats.length && !resultados.prods.length) {
    panel = (
      <div className="search__empty">
        No encontramos “{value}”. Prueba con otra palabra o{" "}
        <a href={wa("pedido", "Hola, busco: " + value)} target="_blank" rel="noopener" style={{ color: "var(--rojo)", fontWeight: 600 }}>
          pregúntanos por WhatsApp
        </a>
        .
      </div>
    );
  } else {
    const nc = resultados.cats.length;
    panel = (
      <>
        {nc > 0 && (
          <div className="search__group">
            <div className="search__label">Categorías</div>
            {resultados.cats.map((c, i) => (
              <CatItem key={c.id} c={c} q={q} active={active === i} />
            ))}
          </div>
        )}
        {resultados.prods.length > 0 && (
          <div className="search__group">
            <div className="search__label">Productos</div>
            {resultados.prods.map((p, i) => (
              <Link
                key={p.id}
                className={"search__item" + (active === nc + i ? " is-active" : "")}
                to={"/catalogo?q=" + encodeURIComponent(p.nombre)}
              >
                <ProductMedia p={p} />
                <span className="search__item-main">
                  <span className="search__item-title">
                    <Mark txt={p.nombre} q={q} />
                  </span>
                  <span className="search__item-sub">
                    {p.presentacion} · {cat(p.categoria)?.corto}
                  </span>
                </span>
                <span className="search__item-price">{precio(precioLista(p))}</span>
              </Link>
            ))}
          </div>
        )}
        <Link
          className={"search__all" + (active === navegables.length - 1 ? " is-active" : "")}
          to={"/catalogo?q=" + encodeURIComponent(value.trim())}
        >
          Ver todos los resultados de “{value.trim()}”
          <Icon name="arrow-right" size={16} />
        </Link>
      </>
    );
  }

  return (
    <div className={"search" + (open ? " is-open" : "") + (value ? " has-text" : "")} ref={boxRef}>
      <form className="search__form" role="search" action="/catalogo" method="get" autoComplete="off" onSubmit={onSubmit}>
        <Icon name="search" size={20} />
        <input
          ref={inputRef}
          className="search__input"
          type="search"
          name="q"
          placeholder="Buscar productos, marcas o categorías…"
          aria-label="Buscar productos"
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setValue(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
        <button
          type="button"
          className="search__clear"
          aria-label="Limpiar búsqueda"
          onClick={() => {
            setValue("");
            inputRef.current?.focus();
          }}
        >
          <Icon name="x" size={16} />
        </button>
        <button type="submit" className="search__submit">
          Buscar
        </button>
      </form>
      <div className="search__panel" role="listbox" aria-label="Resultados" ref={panelRef} onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}>
        {panel}
      </div>
    </div>
  );
}
