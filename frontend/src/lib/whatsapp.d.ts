export type TipoMensaje = "pedido" | "mayor" | "evento" | "sede";
/** Enlace wa.me con mensaje predefinido o personalizado */
export declare function wa(tipo?: TipoMensaje | string, texto?: string, numero?: string): string;
/** Convierte "wa:pedido" en enlace de WhatsApp; deja las demás rutas igual */
export declare function resolveHref(x: string | undefined): string;
export declare function isExternal(x: string | undefined): boolean;
