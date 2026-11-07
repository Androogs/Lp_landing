import type { Banner } from "@/types";
interface AdProps {
    b: Banner;
    pos: number;
    extraClass?: string;
}
/** Cartel tipo poster: titular grande, etiqueta, precio y botella real */
export declare function Poster({ b, pos, extraClass }: AdProps): import("react").JSX.Element;
/** Tarjeta de pauta: arte final (imagen), foto de fondo o tarjeta compuesta por color + producto */
export declare function AdCard({ b, pos, extraClass }: AdProps): import("react").JSX.Element;
export {};
