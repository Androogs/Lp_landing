import { Link } from "react-router-dom";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  usePageTitle("Página no encontrada · Licores Palmira");
  return (
    <main className="contenedor" style={{ padding: "60px 0 80px", maxWidth: 720 }}>
      <div className="catalogo__empty">
        <Icon name="search" size={44} strokeWidth={1.4} />
        <b>No encontramos esta página</b>
        <span>Puede que el enlace haya cambiado. Vuelve al inicio o revisa el catálogo.</span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Link className="btn btn--rojo" to="/">Ir al inicio</Link>
          <Link className="btn btn--outline" to="/catalogo">Ver catálogo</Link>
        </div>
      </div>
    </main>
  );
}
