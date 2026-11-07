export declare class ApiError extends Error {
    status: number;
    code: string;
    details?: {
        campo: string;
        error: string;
    }[] | undefined;
    constructor(status: number, code: string, message: string, details?: {
        campo: string;
        error: string;
    }[] | undefined);
}
/** Algunas respuestas (login) traen un token CSRF nuevo */
export declare const setCsrf: (t: string | undefined) => void;
export declare const api: {
    get: <T>(path: string) => Promise<T>;
    post: <T>(path: string, body: unknown) => Promise<T>;
};
/** Mensaje legible con los campos inválidos que devolvió el servidor */
export declare function mensajeError(e: unknown): string;
export interface Usuario {
    usuario: string;
    nombre: string;
    rol: "mayorista" | "admin";
}
export interface PedidoCreado {
    reference: string;
    estado: string;
    etiqueta: string;
    total: number;
    items: {
        id: string;
        qty: number;
        unit: number;
        subtotal: number;
    }[];
    pago: {
        proveedor: "wompi";
        checkoutUrl: string;
    } | null;
}
export interface EstadoPedido {
    reference: string;
    estado: string;
    etiqueta: string;
    paso: number;
    total: number;
    creado: string;
}
