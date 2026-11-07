import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import Home from "@/pages/Home";

/* Las páginas internas se cargan bajo demanda (code-splitting) para que la portada pese menos */
const Catalogo = lazy(() => import("@/pages/Catalogo"));
const Producto = lazy(() => import("@/pages/Producto"));
const Calculadora = lazy(() => import("@/pages/Calculadora"));
const Mayoristas = lazy(() => import("@/pages/Mayoristas"));
const Seguimiento = lazy(() => import("@/pages/Seguimiento"));
const Ayuda = lazy(() => import("@/pages/Ayuda"));
const Pauta = lazy(() => import("@/pages/Pauta"));
const Creditos = lazy(() => import("@/pages/Creditos"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const PagoResultado = lazy(() => import("@/pages/PagoResultado"));
const NotFound = lazy(() => import("@/pages/NotFound"));

/** Redirige las URL antiguas del sitio estático (catalogo.html?x=…) a las rutas nuevas, conservando parámetros y ancla */
function LegacyRedirect({ to }: { to: string }) {
  const { search, hash } = useLocation();
  return <Navigate to={to + search + hash} replace />;
}

function LegacyProducto() {
  const { search } = useLocation();
  const id = new URLSearchParams(search).get("id");
  return <Navigate to={id ? "/producto/" + id : "/catalogo"} replace />;
}

export default function App() {
  return (
    <Suspense fallback={<main style={{ minHeight: "60vh" }} />}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="catalogo" element={<Catalogo />} />
          <Route path="producto/:id" element={<Producto />} />
          <Route path="producto" element={<LegacyProducto />} />
          <Route path="calculadora" element={<Calculadora />} />
          <Route path="mayoristas" element={<Mayoristas />} />
          <Route path="seguimiento" element={<Seguimiento />} />
          <Route path="ayuda" element={<Ayuda />} />
          <Route path="pauta" element={<Pauta />} />
          <Route path="creditos" element={<Creditos />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="pago/resultado" element={<PagoResultado />} />

          {/* Compatibilidad con los enlaces del sitio estático */}
          <Route path="index.html" element={<LegacyRedirect to="/" />} />
          <Route path="catalogo.html" element={<LegacyRedirect to="/catalogo" />} />
          <Route path="producto.html" element={<LegacyProducto />} />
          <Route path="calculadora.html" element={<LegacyRedirect to="/calculadora" />} />
          <Route path="mayoristas.html" element={<LegacyRedirect to="/mayoristas" />} />
          <Route path="seguimiento.html" element={<LegacyRedirect to="/seguimiento" />} />
          <Route path="ayuda.html" element={<LegacyRedirect to="/ayuda" />} />
          <Route path="pauta.html" element={<LegacyRedirect to="/pauta" />} />
          <Route path="creditos.html" element={<LegacyRedirect to="/creditos" />} />
          {/* "Nosotros" se retiró el 2026-10-08 a pedido del cliente: redirige al inicio */}
          <Route path="nosotros" element={<Navigate to="/" replace />} />
          <Route path="nosotros.html" element={<Navigate to="/" replace />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
