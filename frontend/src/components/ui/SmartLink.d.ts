import { type AnchorHTMLAttributes } from "react";
/**
 * Enlace "inteligente":
 * - "wa:pedido" → WhatsApp en pestaña nueva
 * - http(s) → pestaña nueva con rel="noopener"
 * - mailto:/tel: → enlace normal
 * - rutas internas ("/catalogo?q=x", "/#sedes") → <Link> de React Router (sin recargar)
 */
export declare const SmartLink: import("react").ForwardRefExoticComponent<AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
} & import("react").RefAttributes<HTMLAnchorElement>>;
