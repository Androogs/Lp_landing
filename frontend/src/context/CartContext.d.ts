import { type ReactNode } from "react";
import type { CartItem, Producto, SesionMayorista } from "@/types";
export interface CartLine {
    item: CartItem;
    p: Producto;
    unit: number;
    subtotal: number;
    mayor: boolean;
}
interface CartContextValue {
    items: CartItem[];
    lines: CartLine[];
    count: number;
    total: number;
    ahorro: number;
    /** Cambia cada vez que se añade algo (para animar el contador) */
    bumpKey: number;
    add: (id: string, qty?: number) => void;
    setQty: (id: string, qty: number) => void;
    clear: (opts?: {
        silencioso?: boolean;
    }) => void;
    unitPrice: (p: Producto, qty: number) => number;
    waOrderUrl: string;
    /** Sesión mayorista validada por el servidor (cookie HttpOnly). El navegador no guarda credenciales ni tokens. */
    sesion: SesionMayorista | null;
    login: (usuario: string, clave: string) => Promise<SesionMayorista>;
    logout: () => Promise<void>;
}
export declare function CartProvider({ children }: {
    children: ReactNode;
}): import("react").JSX.Element;
export declare function useCart(): CartContextValue;
export {};
