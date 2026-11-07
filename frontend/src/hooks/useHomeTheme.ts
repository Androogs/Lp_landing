import { useEffect } from "react";

/** Activa el tema oscuro de la portada mientras Home está montada (catálogo y demás páginas no cambian) */
export function useHomeTheme() {
  useEffect(() => {
    const b = document.body;
    b.classList.add("is-home");
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const antes = meta?.content;
    if (meta) meta.content = "#150e09";
    return () => {
      b.classList.remove("is-home");
      if (meta && antes) meta.content = antes;
    };
  }, []);
}
