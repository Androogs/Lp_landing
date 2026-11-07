import { useEffect, useRef, useState, type RefObject } from "react";

/** true la primera vez que el elemento entra en pantalla (y se queda en true) */
export function useInViewOnce<T extends Element>(
  options: IntersectionObserverInit = { threshold: 0.04, rootMargin: "0px 0px -6% 0px" }
): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setVisible(true);
        io.disconnect();
      }
    }, options);
    io.observe(el);
    // respaldo: si ya está en pantalla al cargar
    const t = window.setTimeout(() => {
      if (el.getBoundingClientRect().top < window.innerHeight) setVisible(true);
    }, 1200);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, [visible]);
  return [ref, visible];
}
