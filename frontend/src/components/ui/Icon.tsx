import { ICON_PATHS } from "@/data/icons";

interface IconProps {
  name: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
  title?: string;
  /** Envuelve el SVG en un <span> (igual que los <span data-icon> del HTML estático original) */
  wrap?: boolean;
}

/** Ícono SVG (subconjunto de Lucide). Los trazos vienen de src/data/icons.ts (contenido estático y confiable). */
export function Icon({ name, size = 24, strokeWidth = 2, className, title, wrap }: IconProps) {
  const body = ICON_PATHS[name] ?? ICON_PATHS["circle-alert"] ?? "";
  const svg = (
    <svg
      className={"lp-ico" + (className ? " " + className : "")}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      focusable="false"
      role={title ? "img" : undefined}
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
  return wrap ? <span>{svg}</span> : svg;
}
