import { type ReactNode } from "react";
interface CarouselProps {
    id?: string;
    className?: string;
    trackClassName?: string;
    children: ReactNode;
    /** cambia cuando cambia el contenido, para recalcular los botones */
    itemsKey?: unknown;
}
/** Carrusel horizontal con scroll-snap y botones anterior/siguiente (.carrusel) */
export declare function Carousel({ id, className, trackClassName, children, itemsKey }: CarouselProps): import("react").JSX.Element;
export {};
