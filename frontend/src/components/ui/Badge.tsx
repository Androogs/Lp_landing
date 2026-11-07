import { Icon } from "./Icon";

const CLASES: Record<string, string> = {
  Oferta: "badge--oferta",
  Nuevo: "badge--nuevo",
  "Más vendido": "badge--vendido",
  Premium: "badge--premium"
};

export function Badge({ tipo }: { tipo: string }) {
  return (
    <span className={"badge " + (CLASES[tipo] || "")}>
      {tipo === "Más vendido" && <Icon name="crown" size={12} />}
      {tipo}
    </span>
  );
}
