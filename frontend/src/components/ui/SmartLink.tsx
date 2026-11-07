import { forwardRef, type AnchorHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import { isExternal, resolveHref } from "@/lib/whatsapp";

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/**
 * Enlace "inteligente":
 * - "wa:pedido" → WhatsApp en pestaña nueva
 * - http(s) → pestaña nueva con rel="noopener"
 * - mailto:/tel: → enlace normal
 * - rutas internas ("/catalogo?q=x", "/#sedes") → <Link> de React Router (sin recargar)
 */
export const SmartLink = forwardRef<HTMLAnchorElement, Props>(function SmartLink({ href, children, ...rest }, ref) {
  const url = resolveHref(href);
  if (/^https?:/.test(url)) {
    return (
      <a ref={ref} href={url} target="_blank" rel="noopener" {...rest}>
        {children}
      </a>
    );
  }
  if (isExternal(url) || url === "#" || url === "") {
    return (
      <a ref={ref} href={url || "#"} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <Link ref={ref} to={url} {...rest}>
      {children}
    </Link>
  );
});
