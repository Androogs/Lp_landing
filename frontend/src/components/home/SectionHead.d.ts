import type { ReactNode } from "react";
interface SectionHeadProps {
    id: string;
    kicker: string;
    em: string;
    span: string;
    sub?: string;
    link?: {
        href: string;
        texto: string;
        icon?: string;
    };
    aside?: ReactNode;
    center?: boolean;
    light?: boolean;
}
/** Encabezado de sección de la portada (kicker + título en dos líneas + subtítulo + enlace) */
export declare function SectionHead({ id, kicker, em, span, sub, link, aside, center, light }: SectionHeadProps): import("react").JSX.Element;
export {};
