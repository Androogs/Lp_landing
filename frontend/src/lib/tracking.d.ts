export type TipoEvento = "imp" | "clic";
export type PautaStats = Record<string, {
    imp: number;
    clic: number;
}>;
export declare function track(tipo: TipoEvento, id: string, extra?: {
    pos?: string;
}): void;
/** Impresión una sola vez por sesión por banner */
export declare function trackImpresionUnica(id: string, pos?: string): void;
