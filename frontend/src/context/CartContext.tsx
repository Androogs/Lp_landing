/* Carrito persistente en localStorage con precio mayorista automático
   (desde data.marca.minimoMayor unidades o con sesión mayorista activa). */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { data } from "@/data/data";
import { producto } from "@/lib/catalogo";
import { precio } from "@/lib/format";
import { api, setCsrf, type Usuario } from "@/lib/api";
import { KEYS, readStore, removeStore, writeStore } from "@/lib/storage";
import type { CartItem, ModoPrecio, Producto, SesionMayorista } from "@/types";
import { useUI } from "./UIContext";

export interface CartLine { item: CartItem; p: Producto; unit: number; subtotal: number; mayor: boolean }

interface CartContextValue {
  items: CartItem[];
  lines: CartLine[];
  count: number;
  total: number;
  ahorro: number;
  /** Cambia cada vez que se añade algo (para animar el contador) */
  bumpKey: number;
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  clear: (opts?: { silencioso?: boolean }) => void;
  unitPrice: (p: Producto, qty: number) => number;
  waOrderUrl: string;
  /** Modo de precios elegido tras la puerta de edad; null = aún no ha elegido */
  modo: ModoPrecio | null;
  /** true cuando se muestran precios al por mayor (elección propia o sesión mayorista) */
  esMayor: boolean;
  setModo: (m: ModoPrecio) => void;
  /** Precio unitario que se muestra en la vitrina según el modo elegido */
  precioLista: (p: Producto) => number;
  /** Unidades mínimas del pedido en modo mayorista (0 en modo regular) */
  minimoPedidoMayor: number;
  /** Unidades que faltan para alcanzar el mínimo mayorista (0 = ya cumple o modo regular) */
  faltanMinimoMayor: number;
  /** Sesión mayorista validada por el servidor (cookie HttpOnly). El navegador no guarda credenciales ni tokens. */
  sesion: SesionMayorista | null;
  login: (usuario: string, clave: string) => Promise<SesionMayorista>;
  logout: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { showToast } = useUI();
  const [items, setItems] = useState<CartItem[]>(() => readStore<CartItem[]>(KEYS.carrito) || []);
  const [sesion, setSesion] = useState<SesionMayorista | null>(null);

  // La sesión se consulta al servidor; se elimina el rastro de la versión estática (sesión "demo" en localStorage)
  useEffect(() => {
    removeStore(KEYS.mayorista);
    api
      .get<{ user: Usuario | null }>("/auth/me")
      .then((r) => setSesion(r.user))
      .catch(() => setSesion(null));
  }, []);
  const [bumpKey, setBumpKey] = useState(0);
  // El modo se pregunta en cada visita (después de la puerta de edad): no se guarda entre sesiones
  const [modo, setModoState] = useState<ModoPrecio | null>(null);

  useEffect(() => writeStore(KEYS.carrito, items), [items]);

  const esMayor = modo === "mayorista" || sesion?.rol === "mayorista";
  const setModo = useCallback(
    (m: ModoPrecio) => {
      setModoState(m);
      showToast(m === "mayorista" ? "Mostrando precios al por mayor" : "Mostrando precios regulares", m === "mayorista" ? "boxes" : "shopping-bag");
    },
    [showToast]
  );

  const precioLista = useCallback((p: Producto) => (esMayor ? Math.min(p.mayor, p.detal) : p.detal), [esMayor]);

  // Igual que el servidor: el precio mayorista nunca supera al detal (p. ej. detal en oferta). El servidor recalcula siempre.
  const unitPrice = useCallback(
    (p: Producto, qty: number) => (esMayor || qty >= data.marca.minimoMayor ? Math.min(p.mayor, p.detal) : p.detal),
    [esMayor]
  );

  const add = useCallback(
    (id: string, qty = 1) => {
      const p = producto(id);
      if (!p) return;
      setItems((prev) => {
        const it = prev.find((i) => i.id === id);
        return it ? prev.map((i) => (i.id === id ? { ...i, qty: i.qty + qty } : i)) : [...prev, { id, qty }];
      });
      setBumpKey((k) => k + 1);
      showToast(p.nombre + " añadido al carrito", "shopping-cart");
    },
    [showToast]
  );

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { id, qty } : i)).filter((i) => i.qty > 0));
  }, []);

  const clear = useCallback(
    (opts?: { silencioso?: boolean }) => {
      setItems([]);
      if (!opts?.silencioso) showToast("Carrito vaciado", "trash-2");
    },
    [showToast]
  );

  const login = useCallback(async (usuario: string, clave: string) => {
    const r = await api.post<{ user: Usuario; csrfToken: string }>("/auth/login", { usuario, clave });
    setCsrf(r.csrfToken);
    setSesion(r.user);
    return r.user;
  }, []);
  const logout = useCallback(async () => {
    await api.post("/auth/logout", {}).catch(() => undefined);
    setSesion(null);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const lines: CartLine[] = [];
    let total = 0;
    let ahorro = 0;
    items.forEach((item) => {
      const p = producto(item.id);
      if (!p) return;
      const unit = unitPrice(p, item.qty);
      total += unit * item.qty;
      ahorro += (p.detal - unit) * item.qty;
      lines.push({ item, p, unit, subtotal: unit * item.qty, mayor: unit < p.detal });
    });
    const count = items.reduce((n, i) => n + i.qty, 0);
    const minimoPedidoMayor = esMayor ? data.marca.minimoPedidoMayor : 0;
    const faltanMinimoMayor = Math.max(0, minimoPedidoMayor - count);
    const txt = ["Hola Licores Palmira, quiero hacer este pedido:", ""];
    lines.forEach((l) => txt.push("• " + l.item.qty + " x " + l.p.nombre + " " + l.p.presentacion + " — " + precio(l.subtotal)));
    txt.push("", "Total estimado: " + precio(total));
    if (ahorro) txt.push("(Incluye precio al por mayor: ahorro " + precio(ahorro) + ")");
    txt.push("", "Nombre:", "Dirección de entrega:", "Medio de pago:");
    const waOrderUrl = "https://wa.me/" + data.marca.whatsapp + "?text=" + encodeURIComponent(txt.join("\n"));
    return { items, lines, count, total, ahorro, bumpKey, add, setQty, clear, unitPrice, waOrderUrl, modo, esMayor, setModo, precioLista, minimoPedidoMayor, faltanMinimoMayor, sesion, login, logout };
  }, [items, bumpKey, add, setQty, clear, unitPrice, modo, esMayor, setModo, precioLista, sesion, login, logout]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de <CartProvider>");
  return ctx;
}
