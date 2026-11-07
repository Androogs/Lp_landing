import { usePageTitle } from "@/hooks/usePageTitle";
import credits from "@/data/credits.json";

interface Credito { id: string; title?: string; creator?: string; url: string; source: string; license: string }

export default function Creditos() {
  usePageTitle("Créditos fotográficos · Licores Palmira");
  const list = credits as Credito[];
  return (
    <main className="contenedor" style={{ padding: "40px 0 60px", maxWidth: 820 }}>
      <div className="seccion-title">
        <div className="seccion-title__kicker">Transparencia</div>
        <h1 style={{ fontSize: "clamp(26px,3.4vw,40px)" }}>Créditos fotográficos</h1>
        <p>
          Las fotos del manual de identidad y de la marca son propiedad de Licores Palmira S.A.S. Las fotografías de ambiente de las categorías provienen de bancos libres
          (licencia CC0) a través de Openverse. Las ilustraciones de productos son propias.
        </p>
      </div>
      <ul style={{ marginTop: 24, display: "grid", gap: 10 }}>
        {list.map((c) => (
          <li key={c.id} style={{ padding: "12px 16px", border: "1px solid var(--borde)", borderRadius: 12, fontSize: 14 }}>
            <b style={{ fontFamily: "var(--font-display)" }}>{c.id}</b> · {c.title || "Sin título"}
            {c.creator ? " · " + c.creator : ""} ·{" "}
            <a href={c.url} target="_blank" rel="noopener" style={{ color: "var(--rojo)" }}>
              {c.source} ({c.license.toUpperCase()})
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
