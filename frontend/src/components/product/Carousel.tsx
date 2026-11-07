import { useRef, type MutableRefObject, type ReactNode } from "react";
import { useScrollButtons } from "@/hooks/useScrollButtons";
import { useInViewOnce } from "@/hooks/useInView";
import { Icon } from "@/components/ui/Icon";

interface CarouselProps {
  id?: string;
  className?: string;
  trackClassName?: string;
  children: ReactNode;
  /** cambia cuando cambia el contenido, para recalcular los botones */
  itemsKey?: unknown;
}

/** Carrusel horizontal con scroll-snap y botones anterior/siguiente (.carrusel) */
export function Carousel({ id, className, trackClassName = "carrusel__track", children, itemsKey }: CarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const { atStart, atEnd, prev, next } = useScrollButtons(trackRef, [itemsKey]);
  const [revealRef, visible] = useInViewOnce<HTMLDivElement>();

  const setRefs = (el: HTMLDivElement | null) => {
    (trackRef as MutableRefObject<HTMLDivElement | null>).current = el;
    (revealRef as MutableRefObject<HTMLDivElement | null>).current = el;
  };

  return (
    <div className={"carrusel" + (className ? " " + className : "")} id={id}>
      <button className="carrusel__btn carrusel__btn--prev" type="button" aria-label="Anterior" onClick={prev} disabled={atStart}>
        <Icon name="chevron-left" size={22} />
      </button>
      <div ref={setRefs} className={trackClassName + " reveal reveal--stagger" + (visible ? " is-visible" : "")}>
        {children}
      </div>
      <button className="carrusel__btn carrusel__btn--next" type="button" aria-label="Siguiente" onClick={next} disabled={atEnd}>
        <Icon name="chevron-right" size={22} />
      </button>
    </div>
  );
}
