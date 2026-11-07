/* Carrusel de carteles de pauta (portada): autoplay, puntos y medición de impresiones/clics */
import { useCallback, useEffect, useRef, useState } from "react";
import { data } from "@/data/data";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import { bannersActivos } from "@/lib/catalogo";
import { Icon } from "@/components/ui/Icon";
import { AdCard } from "./AdCard";

export function AdCarousel() {
  const items = bannersActivos();
  const trackRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();
  const idxRef = useRef(0);
  const [idx, setIdx] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const cardW = useCallback(() => {
    const t = trackRef.current;
    const first = t?.querySelector(".ad") as HTMLElement | null;
    if (!t || !first) return 1;
    const cs = getComputedStyle(t);
    return first.getBoundingClientRect().width + parseFloat(cs.columnGap || cs.gap || "18");
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const n = items.length;
      idxRef.current = ((i % n) + n) % n;
      trackRef.current?.scrollTo({ left: idxRef.current * cardW(), behavior: "smooth" });
    },
    [items.length, cardW]
  );

  const sync = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const i = Math.round(t.scrollLeft / cardW());
    idxRef.current = i;
    setIdx(i);
    const max = t.scrollWidth - t.clientWidth - 4;
    setAtStart(t.scrollLeft <= 2);
    setAtEnd(t.scrollLeft >= max);
  }, [cardW]);

  const stop = useCallback(() => window.clearInterval(timer.current), []);
  const play = useCallback(() => {
    stop();
    if (prefersReducedMotion()) return;
    timer.current = window.setInterval(() => {
      const t = trackRef.current;
      if (!t) return;
      const max = t.scrollWidth - t.clientWidth - 4;
      if (t.scrollLeft >= max) goTo(0);
      else goTo(idxRef.current + 1);
    }, (data.pauta.rotacionSeg || 6) * 1000);
  }, [goTo, stop]);

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    const onScroll = () => requestAnimationFrame(sync);
    const onVis = () => (document.hidden ? stop() : play());
    t.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", sync);
    document.addEventListener("visibilitychange", onVis);
    sync();
    play();
    return () => {
      t.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", sync);
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, [sync, play, stop]);

  if (!items.length) return null;
  const visibles = () => Math.max(1, Math.round((trackRef.current?.clientWidth || 1) / cardW()));

  return (
    <section className="pauta" aria-label="Marcas y promociones">
      <div className="contenedor">
        <div className="pauta__wrap" onMouseEnter={stop} onMouseLeave={play}>
          <button className="carrusel__btn carrusel__btn--prev pauta__btn" type="button" aria-label="Anterior" disabled={atStart} onClick={() => { goTo(idxRef.current - 1); play(); }}>
            <Icon name="chevron-left" size={22} />
          </button>
          <div className="pauta__track" ref={trackRef} onTouchStart={stop} onTouchEnd={play}>
            {items.map((b, i) => (
              <AdCard key={b.id} b={b} pos={i + 1} />
            ))}
          </div>
          <button className="carrusel__btn carrusel__btn--next pauta__btn" type="button" aria-label="Siguiente" disabled={atEnd} onClick={() => { goTo(idxRef.current + visibles()); play(); }}>
            <Icon name="chevron-right" size={22} />
          </button>
          <div className="pauta__dots">
            {items.map((b, i) => (
              <button key={b.id} type="button" className={"pauta__dot" + (i === idx ? " is-active" : "")} aria-label={"Banner " + (i + 1)} onClick={() => { goTo(i); play(); }}></button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
