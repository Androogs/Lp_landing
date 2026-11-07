import { useEffect } from "react";

const TITULO_BASE = "Licores Palmira · Licorera en Palmira con domicilio, al detal y al por mayor";

/** Cambia el <title> del documento (y lo restaura al salir de la página) */
export function usePageTitle(title?: string, opts: { noindex?: boolean } = {}): void {
  useEffect(() => {
    document.title = title || TITULO_BASE;
    let meta: HTMLMetaElement | null = null;
    if (opts.noindex) {
      meta = document.createElement("meta");
      meta.name = "robots";
      meta.content = "noindex, nofollow";
      document.head.appendChild(meta);
    }
    return () => {
      document.title = TITULO_BASE;
      meta?.remove();
    };
  }, [title, opts.noindex]);
}
