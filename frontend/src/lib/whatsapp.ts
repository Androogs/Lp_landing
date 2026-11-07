import { data } from "@/data/data";

export type TipoMensaje = "pedido" | "mayor" | "evento" | "sede";

const MENSAJES: Record<TipoMensaje, string> = {
  pedido: data.marca.mensajeWhatsApp,
  mayor: "Hola Licores Palmira, quiero cotizar un pedido al por mayor.",
  evento: "Hola Licores Palmira, necesito licor para un evento. ¿Me ayudan a cotizar?",
  sede: "Hola Licores Palmira, ¿me confirman horario y dirección de la sede?"
};

/** Enlace wa.me con mensaje predefinido o personalizado */
export function wa(tipo: TipoMensaje | string = "pedido", texto?: string, numero = data.marca.whatsapp): string {
  const msg = texto || MENSAJES[tipo as TipoMensaje] || MENSAJES.pedido;
  return "https://wa.me/" + numero + "?text=" + encodeURIComponent(msg);
}

/** Convierte "wa:pedido" en enlace de WhatsApp; deja las demás rutas igual */
export function resolveHref(x: string | undefined): string {
  const v = x || "";
  return v.indexOf("wa:") === 0 ? wa(v.slice(3)) : v;
}

export function isExternal(x: string | undefined): boolean {
  return /^(https?:|mailto:|tel:)/.test(x || "");
}
