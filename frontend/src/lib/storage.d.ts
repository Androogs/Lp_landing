export declare const KEYS: {
    readonly carrito: "lp_carrito";
    readonly mayorista: "lp_mayorista";
    readonly mayorEdad: "lp_mayor_edad";
    readonly pautaStats: "lp_pauta_stats";
    readonly pautaVistos: "lp_pauta_vistos";
};
export declare function readStore<T>(key: string): T | null;
export declare function writeStore(key: string, value: unknown): void;
export declare function removeStore(key: string): void;
