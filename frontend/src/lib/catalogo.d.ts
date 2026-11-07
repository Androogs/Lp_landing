import type { Banner, Categoria, Producto } from "@/types";
export declare function producto(id: string | null | undefined): Producto | undefined;
export declare function cat(id: string | null | undefined): Categoria | undefined;
export declare function prods(ids: string[] | undefined): Producto[];
export declare function bannerVigente(b: Banner): boolean;
export declare function bannersActivos(): Banner[];
