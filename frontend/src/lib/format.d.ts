/** Precio en pesos colombianos: 177500 → "$177.500" */
export declare function precio(n: number): string;
/** Normaliza texto para búsquedas: minúsculas y sin tildes */
export declare function norm(s: unknown): string;
export declare function escapeRegex(s: string): string;
/** Obtiene los ml de una presentación ("750 ml", "1 L"); 750 por defecto */
export declare function mlDe(pres: string | undefined): number;
