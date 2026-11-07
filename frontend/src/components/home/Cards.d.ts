import type { Beneficio, Categoria, Experiencia, Resena, Sede } from "@/types";
/** Tarjeta de categoría compuesta: color de la marca + botellas reales de esa categoría (sin fotos de bar) */
export declare function CategoryCard({ c }: {
    c: Categoria;
}): import("react").JSX.Element;
export declare function CategoryCarousel({ items }: {
    items: Categoria[];
}): import("react").JSX.Element;
export declare function PromoCard({ e }: {
    e: Experiencia;
}): import("react").JSX.Element;
/** Beneficio interactivo: ícono grande, pocas palabras; al tocar se abre el detalle con su botón */
export declare function BenefitCard({ b }: {
    b: Beneficio;
}): import("react").JSX.Element;
/** Reseña real de Google (v4): estrellas + sello Google */
export declare function ReviewCard({ r }: {
    r: Resena;
}): import("react").JSX.Element;
/** Bloque de reseñas (v4): tarjeta resumen con la calificación real de Google + reseñas reales en rejilla */
export declare function ReviewsGrid(): import("react").JSX.Element;
export declare function BrandCarousel(): import("react").JSX.Element;
export declare function LocationCard({ s }: {
    s: Sede;
}): import("react").JSX.Element;
export declare function SedesMap(): import("react").JSX.Element;
export declare function Sedes(): import("react").JSX.Element;
/** Cifras con ícono y color (portada) */
export declare function Cifras(): import("react").JSX.Element;
