/* Hero con slider (data.slides). La portada actual usa el carrusel de pauta en su lugar,
   pero el componente se conserva para volver a activarlo: <Hero /> en src/pages/Home.tsx. */
import { useCallback, useEffect, useRef, useState } from "react";
import { data } from "@/data/data";
import { prefersReducedMotion } from "@/hooks/useReducedMotion";
import type { CSSVars } from "@/lib/colores";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { SmartLink } from "@/components/ui/SmartLink";

const PILLS: [string, string, string][] = [
  ["truck", "Domicilio en Palmira", "#ef1c25"],
  ["badge-percent", "Al por mayor desde 10 und", "#f2592a"],
  ["credit-card", "Efectivo · QR · Tarjeta", "#399933"]
];

export function Hero() {
  const slides = data.slides;
  const [i, setI] = useState(0);
  const timer = useRef<number>();
  const x0 = useRef<number | null>(null);
  const n = slides.length;
  const go = useCallback((k: number) => setI(((k % n) + n) % n), [n]);
  const stop = useCallback(() => window.clearInterval(timer.current), []);
  const play = useCallback(() => {
    stop();
    if (prefersReducedMotion()) return;
    timer.current = window.setInterval(() => setI((x) => (x + 1) % n), 7000);
  }, [n, stop]);

  useEffect(() => {
    const onVis = () => (document.hidden ? stop() : play());
    document.addEventListener("visibilitychange", onVis);
    play();
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      stop();
    };
  }, [play, stop]);

  return (
    <section className="hero">
      <div className="contenedor">
        <div
          className="hero__slider"
          aria-roledescription="carrusel"
          onMouseEnter={stop}
          onMouseLeave={play}
          onTouchStart={(e) => { x0.current = e.touches[0].clientX; stop(); }}
          onTouchEnd={(e) => {
            if (x0.current == null) return;
            const dx = e.changedTouches[0].clientX - x0.current;
            if (Math.abs(dx) > 40) go(dx < 0 ? i + 1 : i - 1);
            x0.current = null;
            play();
          }}
        >
          {slides.map((s, k) => (
            <article key={k} className={"hero__slide" + (k === i ? " is-active" : "")} aria-label={"Banner " + (k + 1) + " de " + n}>
              <div className="hero__media" style={{ "--pos": s.pos || "center" } as CSSVars}>
                <picture>
                  <source media="(max-width: 640px)" srcSet={s.imagenMovil || s.imagen} />
                  <img src={s.imagen} alt="" loading={k === 0 ? undefined : "lazy"} />
                </picture>
              </div>
              <div className="hero__content">
                <span className="hero__kicker"><i></i>{s.kicker}</span>
                {/* el título admite <em> para resaltar (contenido propio de data.ts) */}
                <h1 className="hero__title" dangerouslySetInnerHTML={{ __html: s.titulo }} />
                <p className="hero__text">{s.texto}</p>
                <div className="hero__ctas">
                  <SmartLink className="btn btn--rojo btn--lg" href={s.cta.href}>
                    {s.cta.texto}
                    <Icon name="arrow-right" size={18} />
                  </SmartLink>
                  {s.cta2 && (
                    <SmartLink className="btn btn--ghost btn--lg" href={s.cta2.href}>
                      {s.cta2.href.indexOf("wa:") === 0 && <Icon name="whatsapp" size={18} />}
                      {s.cta2.texto}
                    </SmartLink>
                  )}
                </div>
              </div>
            </article>
          ))}
          <button className="hero__nav hero__nav--prev" type="button" aria-label="Anterior" onClick={() => { go(i - 1); play(); }}>
            <Icon name="chevron-left" size={22} />
          </button>
          <button className="hero__nav hero__nav--next" type="button" aria-label="Siguiente" onClick={() => { go(i + 1); play(); }}>
            <Icon name="chevron-right" size={22} />
          </button>
          <div className="hero__dots">
            {slides.map((_, k) => (
              <button key={k} className={"hero__dot" + (k === i ? " is-active" : "")} type="button" aria-label={"Ir al banner " + (k + 1)} onClick={() => { go(k); play(); }}></button>
            ))}
          </div>
        </div>
        <Reveal className="hero__pills" stagger>
          {PILLS.map(([ico, txt, color]) => (
            <span key={txt} className="hero__pill" style={{ "--pill-color": color } as CSSVars}>
              <Icon name={ico} size={18} />
              {txt}
            </span>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
