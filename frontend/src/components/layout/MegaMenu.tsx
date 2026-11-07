/* Barra fija de categorías con menús desplegables (subcategorías + banner vendible) */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { data } from "@/data/data";
import { cat } from "@/lib/catalogo";
import type { Categoria, MenuGrupo } from "@/types";
import { AdCard } from "@/components/home/AdCard";
import { Icon } from "@/components/ui/Icon";

/** Banner dentro del menú desplegable (espacio vendible); si no hay pauta, foto de la categoría */
function MenuBanner({ g }: { g: MenuGrupo }) {
  const b = data.pauta.menu?.[g.id];
  if (b) return <AdCard b={b} pos={0} extraClass="ad--menu" />;
  const c = cat(g.categorias[0]);
  if (!c) return null;
  return (
    <Link className="mega__fallback" to={"/catalogo?categoria=" + c.id}>
      <img src={c.imagen} alt="" loading="lazy" decoding="async" />
      <span>
        <b>{c.nombre}</b>
        <small>{c.cantidad} productos · Ver todo</small>
      </span>
    </Link>
  );
}

const hayHover = () => typeof window !== "undefined" && window.matchMedia("(hover: hover)").matches;

export function MegaMenu({ activa }: { activa?: string }) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const timer = useRef<number>();
  const hover = useRef(hayHover());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(null);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(timer.current);
    };
  }, []);

  const programar = (id: string | null, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAbierto(id), ms);
  };

  return (
    <nav className="catbar megabar" aria-label="Categorías">
      <div className="contenedor megabar__inner">
        {data.menu.map((g) => {
          const cats = g.categorias.map(cat).filter((c): c is Categoria => !!c);
          if (!cats.length) return null;
          const activo = cats.some((c) => activa === "cat:" + c.id);
          const isOpen = abierto === g.id;
          return (
            <div
              key={g.id}
              className={"megabar__item" + (activo ? " is-active" : "") + (isOpen ? " is-open" : "")}
              onMouseEnter={hover.current ? () => programar(g.id, 90) : undefined}
              onMouseLeave={hover.current ? () => programar(null, 160) : undefined}
              onFocus={hover.current ? () => { window.clearTimeout(timer.current); setAbierto(g.id); } : undefined}
              onBlur={
                hover.current
                  ? (e) => {
                      if (!e.currentTarget.contains(e.relatedTarget as Node)) setAbierto((a) => (a === g.id ? null : a));
                    }
                  : undefined
              }
            >
              <Link className="megabar__link" to={"/catalogo?categoria=" + cats[0].id} aria-haspopup="true" aria-expanded={isOpen} onClick={() => setAbierto(null)}>
                {g.nombre}
                <Icon name="chevron-down" size={14} />
              </Link>
              <div className="mega" aria-label={g.nombre} onClick={(e) => (e.target as HTMLElement).closest("a") && setAbierto(null)}>
                <div className="mega__banner">
                  <MenuBanner g={g} />
                </div>
                <div className={"mega__cols mega__cols--" + cats.length}>
                  {cats.map((c) => {
                    const subs = (c.subs || []).filter((s) => data.productos.some((p) => p.categoria === c.id && p.sub === s.id));
                    return (
                      <div className="mega__col" key={c.id}>
                        <Link className="mega__head" to={"/catalogo?categoria=" + c.id}>
                          <Icon name={c.icono} size={16} />
                          {c.nombre}
                        </Link>
                        {subs.map((s) => (
                          <Link key={s.id} className="mega__link" to={"/catalogo?categoria=" + c.id + "&sub=" + s.id}>
                            {s.nombre}
                          </Link>
                        ))}
                        <Link className="mega__link mega__link--all" to={"/catalogo?categoria=" + c.id}>
                          Ver todos <Icon name="arrow-right" size={14} />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
        <Link className="megabar__link megabar__link--ofertas" to="/catalogo?filtro=ofertas">
          Ofertas<i></i>
        </Link>
      </div>
    </nav>
  );
}
