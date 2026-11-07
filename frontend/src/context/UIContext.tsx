/* Estado global de interfaz: toast, paneles (carrito / menú móvil), modal de producto y puertas de entrada. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { track } from "@/lib/tracking";

type Panel = "cart" | "mnav" | null;

export interface ToastState { msg: string; icon: string; key: number }

interface UIContextValue {
  toast: ToastState | null;
  toastVisible: boolean;
  showToast: (msg: string, icon?: string) => void;
  panel: Panel;
  openCart: () => void;
  openMobileNav: () => void;
  closePanels: () => void;
  productModal: string | null;
  openProduct: (id: string) => void;
  closeProduct: () => void;
  ageGateOpen: boolean;
  setAgeGateOpen: (v: boolean) => void;
  modoGateOpen: boolean;
  setModoGateOpen: (v: boolean) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const [toastOn, setToastOn] = useState(false);
  const toastTimer = useRef<number>();
  const [panel, setPanel] = useState<Panel>(null);
  const [productModal, setProductModal] = useState<string | null>(null);
  const [ageGateOpen, setAgeGateOpen] = useState(false);
  const [modoGateOpen, setModoGateOpen] = useState(false);

  const showToast = useCallback((msg: string, icon = "circle-check") => {
    setToast({ msg, icon, key: Date.now() });
    setToastOn(true);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastOn(false), 2600);
  }, []);

  const closePanels = useCallback(() => setPanel(null), []);
  const openCart = useCallback(() => setPanel("cart"), []);
  const openMobileNav = useCallback(() => setPanel("mnav"), []);

  const openProduct = useCallback((id: string) => {
    setProductModal(id);
    track("clic", "ficha-" + id);
  }, []);
  const closeProduct = useCallback(() => setProductModal(null), []);

  // body.no-scroll mientras haya un panel, modal, la puerta de edad o la de modo abiertos
  useEffect(() => {
    const lock = panel !== null || productModal !== null || ageGateOpen || modoGateOpen;
    document.body.classList.toggle("no-scroll", lock);
  }, [panel, productModal, ageGateOpen, modoGateOpen]);

  // Escape cierra paneles y modal (igual que la versión estática)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setPanel(null);
      setProductModal(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo<UIContextValue>(
    () => ({
      toast, toastVisible: toastOn,
      showToast, panel, openCart, openMobileNav, closePanels,
      productModal, openProduct, closeProduct,
      ageGateOpen, setAgeGateOpen, modoGateOpen, setModoGateOpen
    }),
    [toast, toastOn, showToast, panel, openCart, openMobileNav, closePanels, productModal, openProduct, closeProduct, ageGateOpen, modoGateOpen]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI debe usarse dentro de <UIProvider>");
  return ctx;
}
