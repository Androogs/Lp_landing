/* Tarjetas de la portada: categorías, promos, beneficios, reseñas, marcas, sedes y cifras */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { data } from "@/data/data";
import { useInViewOnce } from "@/hooks/useInView";
import { prods } from "@/lib/catalogo";
import { gradVars, gradVarsTexto, type CSSVars } from "@/lib/colores";
import { resolveHref } from "@/lib/whatsapp";
import { wa } from "@/lib/whatsapp";
import type { Beneficio, Categoria, Cifra, Experiencia, MarcaLogo, Resena, Sede } from "@/types";
import { Icon } from "@/components/ui/Icon";
import { ProductMedia } from "@/components/ui/ProductMedia";
import { Reveal } from "@/components/ui/Reveal";
import { SmartLink } from "@/components/ui/SmartLink";
import { Carousel } from "@/components/product/Carousel";

/* ---------- Categorías ---------- */
/** Tarjeta de categoría compuesta: color de la marca + botellas reales de esa categoría (sin fotos de bar) */
export function CategoryCard({ c }: { c: Categoria }) {
  const conFoto = data.productos.filter((p) => p.categoria === c.id && p.imagen).slice(0, 3);
  const arts = conFoto.length ? conFoto : data.productos.filter((p) => p.categoria === c.id).slice(0, 3);
  const style: CSSVars = { "--cat-color": c.color, ...gradVars(c.color) };
  return (
    <Link className="cat-card cat-card--comp" to={"/catalogo?categoria=" + c.id} style={style}>
      <span className="cat-card__bg"></span>
      <span className={"cat-card__bottles cat-card__bottles--" + arts.length}>
        {arts.map((p) => (
          <span key={p.id}><ProductMedia p={p} /></span>
        ))}
      </span>
      <span className="cat-card__icon"><Icon name={c.icono} size={20} /></span>
      <span className="cat-card__body">
        <span className="cat-card__name">{c.nombre}</span>
        <span className="cat-card__meta">
          <span>{c.cantidad} productos</span>
          <span className="cat-card__cta">Ver todo <Icon name="arrow-right" size={14} /></span>
        </span>
      </span>
    </Link>
  );
}

export function CategoryCarousel({ items }: { items: Categoria[] }) {
  return (
    <Carousel className="carrusel--cats">
      {items.map((c) => (
        <CategoryCard key={c.id} c={c} />
      ))}
    </Carousel>
  );
}

/* ---------- Promos ---------- */
export function PromoCard({ e }: { e: Experiencia }) {
  const u = resolveHref(e.href);
  const esWa = e.href.indexOf("wa:") === 0;
  /* v4: tarjeta de color sólido de la paleta con el logo oficial (ejemplo enviado por el cliente) */
  if (e.logo) {
    return (
      <SmartLink className={"promo promo--solido" + (e.ancho ? " promo--ancho" : "")} href={u} style={{ ["--c" as string]: e.color }}>
        <div className="promo__body">
          {e.kicker && <span className="promo__kicker">{e.kicker}</span>}
          <h3 className="promo__title">{e.titulo}</h3>
          <p className="promo__text">{e.texto}</p>
          <span className="btn btn--blanco btn--sm promo__cta">
            {esWa && <Icon name="whatsapp" size={16} />}
            {e.cta}
            <Icon name="arrow-right" size={16} />
          </span>
        </div>
        <span className="promo__logo"><img src="/assets/marca/logo-blanco.webp" alt="Licores Palmira" loading="lazy" decoding="async" /></span>
      </SmartLink>
    );
  }
  const ps = e.arte ? [] : prods(e.productos);
  const cls =
    "promo" + (e.ancho ? " promo--ancho" : "") + (e.arte ? " promo--arte promo--arte-" + e.id : "") + (ps.length ? " promo--comp" : "") + (e.icono ? " promo--icono" : "");
  const style: CSSVars | undefined = ps.length ? { "--c1": e.c1 || "", "--c2": e.c2 || "", "--c3": e.c3 || e.c2 || "" } : undefined;
  return (
    <SmartLink className={cls} href={u} style={style}>
      {e.arte ? (
        <img className="promo__arte" src={e.arte} alt="" loading="lazy" decoding="async" />
      ) : e.imagen ? (
        <img src={e.imagen} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className="promo__deco"></span>
      )}
      <div className="promo__body">
        {e.kicker && <span className="promo__kicker">{e.kicker}</span>}
        <h3 className="promo__title">{e.titulo}</h3>
        <p className="promo__text">{e.texto}</p>
        <span className="btn btn--amarillo btn--sm promo__cta">
          {esWa && <Icon name="whatsapp" size={16} />}
          {e.cta}
          <Icon name="arrow-right" size={16} />
        </span>
      </div>
      {ps.length > 0 && (
        <span className="promo__products">
          {ps.map((p) => (
            <span key={p.id}><ProductMedia p={p} /></span>
          ))}
        </span>
      )}
      {e.icono && <span className="promo__icono"><Icon name={e.icono} size={150} /></span>}
      {e.logoBadge && (
        <span className="promo__logo-badge"><img src="/assets/marca/logo-blanco.webp" alt="Licores Palmira" loading="lazy" decoding="async" /></span>
      )}
    </SmartLink>
  );
}

/* ---------- Beneficios ---------- */
/** Beneficio interactivo: ícono grande, pocas palabras; al tocar se abre el detalle con su botón */
export function BenefitCard({ b }: { b: Beneficio }) {
  const [open, setOpen] = useState(false);
  const style: CSSVars = { "--b-color": b.color, ...gradVars(b.color) };
  const toggle = (target: EventTarget) => {
    if ((target as HTMLElement).closest("a")) return;
    setOpen((v) => !v);
  };
  return (
    <div
      className={"bene-tile" + (open ? " is-open" : "")}
      style={style}
      tabIndex={0}
      role="button"
      aria-expanded={open}
      onClick={(e) => toggle(e.target)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
          e.preventDefault();
          setOpen((v) => !v);
        }
      }}
    >
      <span className="bene-tile__icon"><Icon name={b.icono} size={32} /></span>
      <span className="bene-tile__title">{b.titulo}</span>
      <span className="bene-tile__text">{b.texto}</span>
      <span className="bene-tile__more">
        <span>{b.mas || ""}</span>
        {b.href && (
          <SmartLink className="btn btn--blanco btn--sm" href={b.href}>
            {b.cta || "Ver más"}
            <Icon name="arrow-right" size={14} />
          </SmartLink>
        )}
      </span>
      <span className="bene-tile__plus"><Icon name="plus" size={16} /></span>
    </div>
  );
}

/* ---------- Reseñas ---------- */
/** Reseña real de Google (v4): estrellas + sello Google */
export function ReviewCard({ r }: { r: Resena }) {
  return (
    <article className="resena">
      <div className="resena__top">
        <div className="resena__stars" aria-label={r.estrellas + " de 5 estrellas"}>
          {[0, 1, 2, 3, 4].map((i) => (
            <i key={i} className={i < r.estrellas ? "is-on" : ""}>★</i>
          ))}
        </div>
        <span className="resena__g">Google</span>
      </div>
      <p className="resena__text">“{r.texto}”</p>
      <div className="resena__who">
        <span className="resena__avatar">{r.nombre.charAt(0)}</span>
        <div>
          <b>{r.nombre}</b>
          <small>{r.lugar} · {r.fecha}</small>
        </div>
      </div>
    </article>
  );
}

/** Bloque de reseñas (v4): tarjeta resumen con la calificación real de Google + reseñas reales en rejilla */
export function ReviewsGrid() {
  const m = data.marca;
  const url = m.googleResenas || "#";
  return (
    <Reveal className="resenas-grid" stagger>
      <article className="resena resena--resumen">
        <span className="resena__g">Google</span>
        <div className="resena__big">{m.googleCalificacion || ""}</div>
        <div className="resena__stars" aria-hidden="true">
          <i className="is-on">★</i><i className="is-on">★</i><i className="is-on">★</i><i className="is-on">★</i><i className="is-on">★</i>
        </div>
        <p className="resena__meta">Calificación de <b>{m.googleTotal || 0} reseñas</b> en Google Maps</p>
        <div className="resena__acciones">
          <a className="btn btn--negro btn--sm" href={url} target="_blank" rel="noopener">Ver todas <Icon name="arrow-up-right" size={15} /></a>
          <a className="btn btn--outline btn--sm" href={url} target="_blank" rel="noopener">Escribir reseña</a>
        </div>
      </article>
      {(data.resenas || []).map((r) => (
        <ReviewCard key={r.nombre} r={r} />
      ))}
    </Reveal>
  );
}

/* ---------- Marcas ---------- */
export function BrandCarousel() {
  const mitad = Math.ceil(data.marcas.length / 2);
  const a = data.marcas.slice(0, mitad);
  const b = data.marcas.slice(mitad);
  const tile = (m: MarcaLogo, i: number) => (
    <Link key={m.nombre + i} className={"marca" + (m.chico ? " marca--chico" : "")} to={"/catalogo?q=" + encodeURIComponent(m.nombre)} title={"Ver productos " + m.nombre} aria-label={"Ver productos " + m.nombre}>
      {m.logo ? <img src={m.logo} alt={m.nombre} loading="lazy" decoding="async" style={m.logoAncho ? { maxWidth: m.logoAncho } : undefined} /> : m.nombre}
    </Link>
  );
  return (
    <div className="marcas" aria-label="Marcas disponibles">
      <div className="marcas__row">{a.concat(a).map(tile)}</div>
      <div className="marcas__row marcas__row--rev">{b.concat(b).map(tile)}</div>
    </div>
  );
}

/* ---------- Sedes ---------- */
export function LocationCard({ s }: { s: Sede }) {
  return (
    <article className="sede" style={{ ["--s-color" as string]: s.color }}>
      <div>
        <div className="sede__head">
          <div>
            <h3 className="sede__name">{s.nombre}</h3>
            <div className="sede__type">{s.tipo}</div>
          </div>
          {s.principal && <span className="badge badge--vendido sede__badge">Principal</span>}
        </div>
        <div className="sede__rows">
          <div className="sede__row"><Icon name="map-pin" size={17} /><span>{s.direccion} · {s.ciudad}</span></div>
          <div className="sede__row"><Icon name="clock" size={17} /><span>{s.horario}</span></div>
          <div className="sede__row"><Icon name="phone" size={17} /><span>{s.telefono}</span></div>
        </div>
        <div className="sede__actions">
          <a className="btn btn--outline btn--sm" href={s.comoLlegar} target="_blank" rel="noopener"><Icon name="navigation" size={15} />Cómo llegar</a>
          <a className="btn btn--wa btn--sm" href={wa("sede", "Hola, ¿me confirman horario y dirección de " + s.nombre + "?")} target="_blank" rel="noopener">
            <Icon name="whatsapp" size={15} />WhatsApp
          </a>
        </div>
      </div>
    </article>
  );
}

export function SedesMap() {
  const p = data.sedes.find((s) => s.principal) || data.sedes[0];
  return (
    <div className="sedes__map">
      <iframe src={p.mapa} loading="lazy" title={"Mapa de " + p.nombre} referrerPolicy="no-referrer-when-downgrade" allowFullScreen></iframe>
      <div className="sedes__map-card">
        <Icon name="map-pin" size={20} />
        <div>
          <b>{p.nombre}</b>
          <br />
          {p.direccion}, {p.ciudad}
        </div>
      </div>
    </div>
  );
}

export function Sedes() {
  return (
    <div className="sedes">
      <Reveal className="sedes__list" stagger>
        {data.sedes.map((s) => (
          <LocationCard key={s.id} s={s} />
        ))}
      </Reveal>
      <Reveal>
        <SedesMap />
      </Reveal>
    </div>
  );
}

/* ---------- Cifras ---------- */
function CifraNum({ c }: { c: Cifra }) {
  const [ref, visible] = useInViewOnce<HTMLDivElement>({ threshold: 0.3 });
  const [v, setV] = useState(0);
  const raf = useRef<number>();
  useEffect(() => {
    if (!visible) return;
    const t0 = performance.now();
    const dur = 1400;
    const f = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setV(Math.round(c.valor * e));
      if (k < 1) raf.current = requestAnimationFrame(f);
    };
    raf.current = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf.current!);
  }, [visible, c.valor]);
  return (
    <div className="cifra__num" ref={ref}>
      {/* igual que la versión estática: muestra "0" hasta que arranca el conteo */}
      {visible ? (c.prefijo || "") + (c.formato === "anio" ? v : v.toLocaleString("es-CO")) + (c.sufijo || "") : "0"}
    </div>
  );
}

/** Cifras con ícono y color (portada) */
export function Cifras() {
  return (
    <Reveal className="cifras" stagger>
      {(data.cifras || []).map((c) => (
        <div key={c.etiqueta} className="cifra" style={{ "--c": c.color || "#feb140", ...gradVarsTexto(c.color) } as CSSVars}>
          <span className="cifra__ico"><Icon name={c.icono || "star"} size={24} /></span>
          <CifraNum c={c} />
          <div className="cifra__label">{c.etiqueta}</div>
        </div>
      ))}
    </Reveal>
  );
}
