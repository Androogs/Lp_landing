/* Banner “Selección”: marca exclusiva a todo el ancho con tarjeta de compra (espacio vendible) */
import { useCallback, useEffect, useRef, useState } from "react";
import { data } from "@/data/data";
import { useCart } from "@/context/CartContext";
import { useUI } from "@/context/UIContext";
import { useAdImpression } from "@/hooks/useAdImpression";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { producto } from "@/lib/catalogo";
import type { CSSVars } from "@/lib/colores";
import { precio } from "@/lib/format";
import { track } from "@/lib/tracking";
import type { Seleccion } from "@/types";
import { Icon } from "@/components/ui/Icon";
import { ProductMedia } from "@/components/ui/ProductMedia";
import { Qty } from "@/components/ui/Qty";
import { SmartLink } from "@/components/ui/SmartLink";

function Slide({ s, i, slot, active }: { s: Seleccion; i: number; slot: number; active: boolean }) {
  const { add, esMayor, precioLista } = useCart();
  const { openCart } = useUI();
  const [qty, setQty] = useState(1);
  const pos = "sel" + slot + "-" + (i + 1);
  const ref = useAdImpression<HTMLElement>(s.id, pos, active);
  const p = producto(s.producto);
  const comp = !s.fondo && !s.arte;
  const style: CSSVars = { "--c1": s.c1 || "#141414", "--c2": s.c2 || "#333", "--c3": s.c3 || s.c2 || "#333" };
  const clic = () => track("clic", s.id, { pos });

  return (
    <article ref={ref} className={"sel__slide" + (active ? " is-active" : "") + (s.arte ? " sel__slide--arte" : "")} data-ad={s.id} data-pos={pos} style={style}>
      {s.arte && <img className="sel__arte" src={s.arte} alt={s.marca} loading={i === 0 ? undefined : "lazy"} decoding="async" />}
      <div className="sel__left">
        <div className="sel__top">
          <span className="sel__seal">
            <img src="/assets/marca/isotipo.webp" alt="" />
            <b>Selección</b>
            <small>Licores Palmira</small>
          </span>
          {s.tipo === "patrocinado" && <span className="ad__tag">Patrocinado</span>}
        </div>
        {s.kicker && (
          <span className="sel__kicker">
            {s.rank ? <i className="sel__rank">#{s.rank}</i> : null}
            {s.kicker}
          </span>
        )}
        <h2 className="sel__title">{s.marca}</h2>
        <p className="sel__text">{s.texto}</p>
        <SmartLink className="sel__more" href={s.href} onClick={clic}>
          Conoce más <Icon name="chevron-right" size={18} />
        </SmartLink>
      </div>
      {/* v4: la tarjeta de compra va DENTRO del lado derecho, al lado de la botella (flex), para que nunca se tapen el precio ni el nombre */}
      <div className={"sel__right" + (comp ? " sel__right--comp" : "")}>
        {s.frase && <span className="sel__frase">{s.frase}</span>}
        {comp ? (
          <span className="sel__big">{p && <ProductMedia p={p} />}</span>
        ) : s.arte ? (
          <img className="sel__arte-movil" src={s.arte} alt="" loading="lazy" decoding="async" />
        ) : (
          <img src={s.fondo} alt="" loading={i === 0 ? undefined : "lazy"} decoding="async" />
        )}
        {p && (
          <div className="sel__card">
            <div className="sel__card-media"><ProductMedia p={p} /></div>
            <div className="sel__card-name">{p.nombre} · {p.presentacion}</div>
            <div className="sel__card-price">
              {precio(precioLista(p))}
              <small>{esMayor ? "Precio regular " + precio(p.detal) : "Al por mayor " + precio(p.mayor)}</small>
            </div>
            <div className="sel__card-actions">
              <Qty value={qty} onChange={setQty} />
              <button className="btn btn--rojo" type="button" onClick={() => { clic(); add(p.id, qty); openCart(); }}>
                Agregar
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export function SelectionBanner({ slot }: { slot: number }) {
  const items = (data.seleccion || []).filter((s) => s.slot === slot);
  const [i, setI] = useState(0);
  const timer = useRef<number>();
  const n = items.length;

  const go = useCallback((k: number) => setI(((k % n) + n) % n), [n]);
  const stop = useCallback(() => window.clearInterval(timer.current), []);
  const play = useCallback(() => {
    stop();
    if (prefersReducedMotion() || n < 2) return;
    timer.current = window.setInterval(() => setI((x) => (x + 1) % n), 8000);
  }, [n, stop]);

  useEffect(() => {
    play();
    return stop;
  }, [play, stop]);

  if (!n) return null;
  return (
    <section className="sel" aria-label="Selección Licores Palmira" onMouseEnter={stop} onMouseLeave={play}>
      <div className="contenedor">
        <div className="sel__frame">
          {items.map((s, k) => (
            <Slide key={s.id} s={s} i={k} slot={slot} active={k === i} />
          ))}
          <div className="sel__pager">
            <button type="button" aria-label="Anterior" onClick={() => { go(i - 1); play(); }}>
              <Icon name="chevron-left" size={20} />
            </button>
            <span>
              <b>{i + 1}</b>/{n}
            </span>
            <button type="button" aria-label="Siguiente" onClick={() => { go(i + 1); play(); }}>
              <Icon name="chevron-right" size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
