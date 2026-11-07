export const ETIQUETAS: Record<string, string> = {
  PENDIENTE_PAGO: "Esperando confirmación del pago",
  PAGADO: "Pago aprobado",
  RECHAZADO: "Pago rechazado",
  ANULADO: "Pago anulado",
  ERROR_PAGO: "Hubo un error con el pago",
  POR_CONFIRMAR: "Recibido: un asesor lo confirma por WhatsApp",
  EN_PREPARACION: "En preparación en bodega",
  EN_CAMINO: "En camino",
  ENTREGADO: "Entregado",
  CANCELADO: "Cancelado"
};
export const etiquetaEstado = (s: string) => ETIQUETAS[s] || s;

/** Paso de la línea de tiempo de seguimiento (1 recibido · 2 preparación · 3 camino · 4 entregado) */
export const pasoEstado = (s: string) =>
  ({ POR_CONFIRMAR: 1, PENDIENTE_PAGO: 1, PAGADO: 1, EN_PREPARACION: 2, EN_CAMINO: 3, ENTREGADO: 4 } as Record<string, number>)[s] ?? 0;
