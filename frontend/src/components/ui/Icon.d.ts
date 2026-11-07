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
export declare function Icon({ name, size, strokeWidth, className, title, wrap }: IconProps): import("react").JSX.Element;
export {};
