import { type RefObject } from "react";
/** Estado de los botones anterior/siguiente de un carrusel con scroll-snap */
export declare function useScrollButtons(trackRef: RefObject<HTMLElement>, deps?: unknown[]): {
    atStart: boolean;
    atEnd: boolean;
    prev: () => void | undefined;
    next: () => void | undefined;
};
