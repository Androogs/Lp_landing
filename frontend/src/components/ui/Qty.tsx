import { Icon } from "./Icon";

interface QtyProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}

/** Selector de cantidad (− n +) con los estilos .qty */
export function Qty({ value, onChange, min = 1 }: QtyProps) {
  return (
    <div className="qty">
      <button type="button" aria-label="Menos" onClick={() => onChange(Math.max(min, value - 1))}>
        <Icon name="minus" size={14} />
      </button>
      <span>{value}</span>
      <button type="button" aria-label="Más" onClick={() => onChange(value + 1)}>
        <Icon name="plus" size={14} />
      </button>
    </div>
  );
}
