import { type RefObject } from "react";
/** true la primera vez que el elemento entra en pantalla (y se queda en true) */
export declare function useInViewOnce<T extends Element>(options?: IntersectionObserverInit): [RefObject<T>, boolean];
