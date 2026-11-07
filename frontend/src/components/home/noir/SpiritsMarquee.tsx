/* Franja de destilados que se desliza en horizontal según el scroll (y se puede tocar para ir a la categoría) */
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link } from "react-router-dom";
import { data } from "@/data/data";
import { FRANJA } from "./bottleConfig";

gsap.registerPlugin(ScrollTrigger);

export function SpiritsMarquee() {
  const root = useRef<HTMLDivElement>(null);
  const cats = data.categorias.filter((c) => !c.ocultoEnInicio);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const filas = el.querySelectorAll<HTMLElement>(".sm__fila");
      filas.forEach((f, i) => {
        gsap.fromTo(
          f,
          { xPercent: i % 2 ? -22 : 0 },
          { xPercent: i % 2 ? 0 : -22, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 } }
        );
      });
    });
    return () => mm.revert();
  }, []);

  const fila = (k: string, desde: number) => (
    <div className="sm__fila" key={k} aria-hidden={k === "b" ? true : undefined}>
      {cats.concat(cats).map((c, i) => (
        <Link
          key={c.id + i}
          to={"/catalogo?categoria=" + c.id}
          tabIndex={k === "b" || i >= cats.length ? -1 : undefined}
          style={{ ["--dot" as string]: FRANJA[(i + desde) % FRANJA.length] }}
        >
          {c.corto}
        </Link>
      ))}
    </div>
  );

  return (
    <div className="sm" ref={root} aria-label="Categorías">
      {fila("a", 0)}
      {fila("b", 2)}
    </div>
  );
}
