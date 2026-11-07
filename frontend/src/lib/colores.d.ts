import type { CSSProperties } from "react";
import type { Producto } from "@/types";
/** Estilo inline que admite variables CSS (--c1, --g1, …) */
export type CSSVars = CSSProperties & Record<`--${string}`, string | number>;
/** Las 3 paradas de la combinación que corresponde a un color de la paleta (verdes → fresco, el resto → cálido). */
export declare function degradado(color: string | undefined): string[];
export declare function gradVars(color: string | undefined): CSSVars;
/** Para textos: misma familia pero siempre con el color oscuro primero para que se lea mejor */
export declare function gradVarsTexto(color: string | undefined): CSSVars;
/** Fondo gráfico de cada producto (brief v5): degradado que contrasta con la botella */
export declare function fondoProducto(p: Producto): {
    style: CSSVars;
    clase: string;
};
