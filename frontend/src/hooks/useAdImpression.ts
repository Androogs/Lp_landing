import { useEffect, useRef } from "react";
import { trackImpresionUnica } from "@/lib/tracking";

/** Cuenta la impresión de un espacio de pauta cuando se ve al menos a la mitad (una vez por sesión) */
export function useAdImpression<T extends Element>(id: string, pos: string | number, enabled = true) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((x) => {
          if (x.intersectionRatio >= 0.5) {
            trackImpresionUnica(id, String(pos));
            io.disconnect();
          }
        });
      },
      { threshold: [0.5] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [id, pos, enabled]);
  return ref;
}
