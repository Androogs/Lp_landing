import { useCallback, useEffect, useState, type RefObject } from "react";

/** Estado de los botones anterior/siguiente de un carrusel con scroll-snap */
export function useScrollButtons(trackRef: RefObject<HTMLElement>, deps: unknown[] = []) {
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    const max = t.scrollWidth - t.clientWidth - 2;
    setAtStart(t.scrollLeft <= 2);
    setAtEnd(t.scrollLeft >= max);
  }, [trackRef]);

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    t.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const id = window.setTimeout(update, 50);
    return () => {
      t.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.clearTimeout(id);
    };
  }, [update, ...deps]);

  const step = () => {
    const first = trackRef.current?.children[0] as HTMLElement | undefined;
    return first ? first.getBoundingClientRect().width + 18 : 300;
  };
  const prev = () => trackRef.current?.scrollBy({ left: -step() * 2, behavior: "smooth" });
  const next = () => trackRef.current?.scrollBy({ left: step() * 2, behavior: "smooth" });

  return { atStart, atEnd, prev, next };
}
