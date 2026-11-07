import { Outlet } from "react-router-dom";
import { AgeGate, CartDrawer, FloatingButtons, FondoMarca, MobileNav, ModeGate, Overlay, ProductModal, TabBar, Toast } from "./Extras";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { ScrollManager } from "./ScrollManager";

/** Estructura común de todas las páginas (equivale a header + footer + extras de la versión estática) */
export function Layout() {
  return (
    <>
      <ScrollManager />
      <FondoMarca />
      <Header />
      <Outlet />
      <Footer />
      <FloatingButtons />
      <TabBar />
      <Overlay />
      <CartDrawer />
      <MobileNav />
      <AgeGate />
      <ModeGate />
      <Toast />
      <ProductModal />
    </>
  );
}
