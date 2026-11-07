import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Al cambiar de página sube al inicio; si la ruta trae #ancla, se desplaza hasta esa sección */
export function ScrollManager() {
  const { pathname, hash, key } = useLocation();
  useEffect(() => {
    if (hash) {
      const t = window.setTimeout(() => {
        document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      return () => window.clearTimeout(t);
    }
    window.scrollTo({ top: 0 });
  }, [pathname, hash, key]);
  return null;
}
