/* Flotantes, barra móvil, carrito, menú móvil, puerta de edad, toast y modal de producto */
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { data } from "@/data/data";
import { useCart } from "@/context/CartContext";
import { useUI } from "@/context/UIContext";
import { producto } from "@/lib/catalogo";
import { precio } from "@/lib/format";
import { wa } from "@/lib/whatsapp";
import type { ModoPrecio } from "@/types";
import { Icon } from "@/components/ui/Icon";
import { ProductMedia } from "@/components/ui/ProductMedia";
import { ProductDetail } from "@/components/product/ProductDetail";
import { CartBadge, PriceModeSwitch } from "./Header";
import { FOCUS_SEARCH_EVENT } from "./SearchBar";

export function FloatingButtons() {
  const { openCart } = useUI();
  const [top, setTop] = useState(false);
  useEffect(() => {
    let tick = false;
    const onScroll = () => {
      if (tick) return;
      tick = true;
      requestAnimationFrame(() => {
        setTop(window.scrollY > 600);
        tick = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <>
      <a className="fab fab--wa wa-fab" href={wa("pedido")} target="_blank" rel="noopener" aria-label="Escribir por WhatsApp a Licores Palmira">
        <span className="wa-fab__ondas" aria-hidden="true"><i></i><i></i></span>
        <span className="wa-fab__icono"><Icon name="whatsapp" size={34} /></span>
        <span className="wa-fab__badge" aria-hidden="true">1</span>
        <span className="wa-fab__globo" aria-hidden="true">
          <b>Licores Palmira</b>
          <span>¡Hola! ¿En qué te ayudamos? Escríbenos aquí</span>
        </span>
      </a>
      <button className="fab fab--cart" type="button" aria-label="Abrir carrito" onClick={openCart}>
        <Icon name="shopping-cart" size={24} />
        <CartBadge />
        <span className="fab__tip">Tu carrito</span>
      </button>
      <button className={"fab fab--top" + (top ? " is-visible" : "")} type="button" aria-label="Volver arriba" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        <Icon name="chevron-up" size={22} />
      </button>
    </>
  );
}

export function TabBar() {
  const { openCart } = useUI();
  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? "is-active" : undefined);
  return (
    <nav className="tabbar" aria-label="Navegación móvil">
      <NavLink to="/" end className={cls}><Icon name="home" />Inicio</NavLink>
      <NavLink to="/catalogo" className={cls}><Icon name="layout-grid" />Catálogo</NavLink>
      <button type="button" onClick={() => window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT))}>
        <Icon name="search" />Buscar
      </button>
      <a className="tabbar__wa" href={wa("pedido")} target="_blank" rel="noopener"><Icon name="whatsapp" />WhatsApp</a>
      <button type="button" onClick={openCart}>
        <Icon name="shopping-cart" />
        <CartBadge />
        Carrito
      </button>
    </nav>
  );
}

function HintMayor() {
  const { esMayor } = useCart();
  return (
    <div className="drawer__hint">
      <Icon name="badge-percent" size={16} />
      <span>
        {esMayor
          ? "Estás viendo precios al por mayor en toda la tienda."
          : `Desde ${data.marca.minimoMayor} unidades de una misma referencia aplica el precio al por mayor automáticamente.`}
      </span>
    </div>
  );
}

export function CartDrawer() {
  const { panel, closePanels } = useUI();
  const { lines, count, total, ahorro, setQty, clear, waOrderUrl, minimoPedidoMayor, faltanMinimoMayor } = useCart();
  const open = panel === "cart";
  return (
    <aside className={"drawer" + (open ? " is-open" : "")} aria-label="Carrito de compras" aria-hidden={!open}>
      <div className="drawer__head">
        <h3>
          <Icon name="shopping-cart" size={22} />
          Tu carrito <span className="drawer__count">{count + (count === 1 ? " producto" : " productos")}</span>
        </h3>
        <button className="icon-btn" type="button" aria-label="Cerrar carrito" style={{ color: "#141414" }} onClick={closePanels}>
          <Icon name="x" size={22} />
        </button>
      </div>
      <div className="drawer__body">
        {!lines.length ? (
          <div className="drawer__empty">
            <Icon name="shopping-bag" size={48} strokeWidth={1.4} />
            <b>Tu carrito está vacío</b>
            <span>Explora las categorías y añade tus favoritos.</span>
            <Link className="btn btn--rojo" to="/catalogo" onClick={closePanels}>Ver catálogo</Link>
          </div>
        ) : (
          lines.map(({ item, p, unit, mayor }) => (
            <div className="cart-item" key={p.id}>
              <div className="cart-item__media"><ProductMedia p={p} /></div>
              <div>
                <div className="cart-item__name">{p.nombre}</div>
                <div className="cart-item__pres">{p.presentacion}</div>
                <div className="cart-item__price">
                  {precio(unit)} c/u
                  {mayor && <span className="cart-item__mayor">Precio mayorista</span>}
                </div>
              </div>
              <div className="cart-item__right">
                <div className="qty">
                  <button type="button" aria-label="Menos" onClick={() => setQty(p.id, item.qty - 1)}><Icon name="minus" size={14} /></button>
                  <span>{item.qty}</span>
                  <button type="button" aria-label="Más" onClick={() => setQty(p.id, item.qty + 1)}><Icon name="plus" size={14} /></button>
                </div>
                <b style={{ fontFamily: "var(--font-display)" }}>{precio(unit * item.qty)}</b>
                <button className="cart-item__remove" type="button" onClick={() => setQty(p.id, 0)}>
                  <Icon name="trash-2" size={13} />
                  Quitar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="drawer__foot">
        <HintMayor />
        {lines.length > 0 && (
          <>
            <div className="drawer__total"><span>Total estimado</span><b>{precio(total)}</b></div>
            {ahorro > 0 && <div className="drawer__savings">Estás ahorrando {precio(ahorro)} con precio mayorista</div>}
            {faltanMinimoMayor > 0 ? (
              <div className="drawer__hint drawer__hint--min" role="alert">
                <Icon name="boxes" size={16} />
                <span>La compra mayorista es desde <b>{minimoPedidoMayor} unidades</b> en total. Te faltan <b>{faltanMinimoMayor}</b>.</span>
              </div>
            ) : (
              <div className="drawer__actions">
                <Link className="btn btn--rojo btn--lg btn--block" to="/checkout" onClick={closePanels}>
                  <Icon name="lock" size={20} />
                  Pagar en línea o contra entrega
                </Link>
                <a className="btn btn--wa btn--lg btn--block" href={waOrderUrl} target="_blank" rel="noopener">
                  <Icon name="whatsapp" size={20} />
                  Pedir por WhatsApp
                </a>
              </div>
            )}
            <div className="drawer__actions">
              <button className="btn btn--outline btn--block" type="button" onClick={() => clear()}>Vaciar carrito</button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

export function MobileNav() {
  const { panel, closePanels } = useUI();
  const m = data.marca;
  const open = panel === "mnav";
  return (
    <aside className={"mnav" + (open ? " is-open" : "")} aria-label="Menú" aria-hidden={!open} onClick={(e) => (e.target as HTMLElement).closest("a") && closePanels()}>
      <div className="mnav__head">
        <img src="/assets/marca/logo-blanco.webp" alt="Licores Palmira" />
        <button className="icon-btn" type="button" aria-label="Cerrar menú" onClick={closePanels}><Icon name="x" size={24} /></button>
      </div>
      <div className="mnav__body">
        <div className="mnav__label">Modo de precios</div>
        <PriceModeSwitch />
        <div className="mnav__label">Menú</div>
        <Link className="mnav__link" to="/"><Icon name="home" size={20} />Inicio</Link>
        <Link className="mnav__link" to="/catalogo"><Icon name="layout-grid" size={20} />Catálogo completo</Link>
        <Link className="mnav__link" to="/#sedes"><Icon name="map-pin" size={20} />Sedes</Link>
        <Link className="mnav__link" to="/calculadora"><Icon name="party-popper" size={20} />Calculadora de eventos</Link>
        <Link className="mnav__link" to="/mayoristas"><Icon name="badge-percent" size={20} />Ventas al por mayor</Link>
        <Link className="mnav__link" to="/seguimiento"><Icon name="package" size={20} />Seguir mi pedido</Link>
        <div className="mnav__label">Categorías</div>
        {data.categorias.map((c) => (
          <Link key={c.id} className="mnav__link" style={{ ["--link-color" as string]: c.color }} to={"/catalogo?categoria=" + c.id}>
            <Icon name={c.icono} size={20} />
            {c.nombre}
          </Link>
        ))}
      </div>
      <div className="mnav__foot">
        <a className="btn btn--wa btn--block" href={wa("pedido")} target="_blank" rel="noopener"><Icon name="whatsapp" size={18} />Pedir por WhatsApp</a>
        <a className="btn btn--outline btn--block" href={"tel:" + m.telefonoIntl.replace(/\s/g, "")}><Icon name="phone" size={18} />{m.telefono}</a>
      </div>
    </aside>
  );
}

export function Overlay() {
  const { panel, closePanels } = useUI();
  return <div className={"overlay" + (panel ? " is-open" : "")} onClick={closePanels}></div>;
}

/** Puerta de edad (18+): se pregunta en cada visita. Al confirmar abre la puerta de modo de precios. */
export function AgeGate() {
  const { ageGateOpen, setAgeGateOpen, setModoGateOpen } = useUI();
  useEffect(() => setAgeGateOpen(true), [setAgeGateOpen]);
  return (
    <div className="agegate" hidden={!ageGateOpen} role="dialog" aria-modal="true" aria-labelledby="agegate-t">
      <div className="agegate__card">
        <img src="/assets/marca/logo-color.webp" alt="Licores Palmira" />
        <h2 id="agegate-t">¿Eres mayor de 18 años?</h2>
        <p>Para entrar a Licores Palmira debes ser mayor de edad. El exceso de alcohol es perjudicial para la salud.</p>
        <div className="agegate__actions">
          <button
            className="btn btn--rojo btn--lg"
            type="button"
            onClick={() => {
              setAgeGateOpen(false);
              setModoGateOpen(true);
            }}
          >
            Sí, soy mayor de 18
          </button>
          <a className="btn btn--outline btn--lg" href="https://www.google.com">Salir</a>
        </div>
        <p className="agegate__legal">Ley 30 de 1986 · Ley 124 de 1994. Prohíbase el expendio de bebidas embriagantes a menores de edad.</p>
      </div>
    </div>
  );
}

/** Puerta de modo de precios: después de la de edad, elige ver precios regulares o al por mayor */
export function ModeGate() {
  const { modoGateOpen, setModoGateOpen } = useUI();
  const { setModo } = useCart();
  const elegir = (m: ModoPrecio) => {
    setModo(m);
    setModoGateOpen(false);
  };
  return (
    <div className="agegate modegate" hidden={!modoGateOpen} role="dialog" aria-modal="true" aria-labelledby="modegate-t">
      <div className="agegate__card modegate__card">
        <img className="modegate__botella modegate__botella--izq" src="/assets/img/productos/p36.webp" alt="" aria-hidden="true" />
        <img className="modegate__botella modegate__botella--der" src="/assets/img/productos/p01.webp" alt="" aria-hidden="true" />
        <img className="modegate__logo" src="/assets/marca/logo-blanco.webp" alt="Licores Palmira" />
        <span className="modegate__kicker">Bienvenido</span>
        <h2 id="modegate-t">¿Cómo compras hoy?</h2>
        <p>Elige tu tipo de compra y te mostramos los precios que te corresponden. Puedes cambiarlo cuando quieras desde la barra superior.</p>
        <div className="modegate__opts">
          <button className="modegate__opt" type="button" onClick={() => elegir("regular")}>
            <span className="modegate__opt-ico"><Icon name="store" size={26} /></span>
            <b>Regular</b>
            <small>Precios al detal para ti o tu evento</small>
          </button>
          <button className="modegate__opt modegate__opt--mayor" type="button" onClick={() => elegir("mayorista")}>
            <span className="modegate__opt-ico"><Icon name="boxes" size={26} /></span>
            <b>Mayorista</b>
            <small>Precios al por mayor para tu negocio</small>
          </button>
        </div>
        <p className="agegate__legal modegate__legal">El precio al por mayor también aplica automáticamente desde {data.marca.minimoMayor} unidades de una misma referencia.</p>
      </div>
    </div>
  );
}

export function Toast() {
  const { toast, toastVisible } = useUI();
  return (
    <div className={"toast" + (toastVisible ? " is-on" : "")} role="status" aria-live="polite">
      {toast && (
        <>
          <Icon name={toast.icon} size={20} />
          <span>{toast.msg}</span>
        </>
      )}
    </div>
  );
}

export function ProductModal() {
  const { productModal, closeProduct } = useUI();
  const p = producto(productModal);
  return (
    <div
      className="pmodal"
      hidden={!p}
      role="dialog"
      aria-modal="true"
      aria-label="Detalle del producto"
      onClick={(e) => e.target === e.currentTarget && closeProduct()}
    >
      <div className="pmodal__box">
        <button className="icon-btn pmodal__close" type="button" aria-label="Cerrar" onClick={closeProduct}><Icon name="x" size={22} /></button>
        <div>{p && <ProductDetail key={p.id} p={p} modal />}</div>
      </div>
    </div>
  );
}

/** Fondo decorativo de toda la web (v5): ondas y manchas de color degradadas sobre crema, fijas detrás del contenido */
export function FondoMarca() {
  return (
    <div className="fondo-marca" aria-hidden="true">
      <span className="fondo-marca__blob fondo-marca__blob--1"></span>
      <span className="fondo-marca__blob fondo-marca__blob--2"></span>
      <span className="fondo-marca__blob fondo-marca__blob--3"></span>
      <span className="fondo-marca__blob fondo-marca__blob--4"></span>
      <svg className="fondo-marca__onda fondo-marca__onda--top" viewBox="0 0 1600 520" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="fmA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ef1c25" /><stop offset=".5" stopColor="#f2592a" /><stop offset="1" stopColor="#feb140" /></linearGradient>
          <linearGradient id="fmB" x1="0" x2="1"><stop offset="0" stopColor="#fcca33" /><stop offset=".5" stopColor="#89c93c" /><stop offset="1" stopColor="#399933" /></linearGradient>
        </defs>
        <path d="M860 0 H1600 V300 C1420 380 1250 250 1080 190 C960 150 900 80 860 0 Z" fill="url(#fmA)" opacity=".85" />
        <path d="M1120 0 H1600 V150 C1480 220 1340 160 1230 110 C1180 85 1150 45 1120 0 Z" fill="url(#fmB)" opacity=".6" />
      </svg>
      <svg className="fondo-marca__onda fondo-marca__onda--bottom" viewBox="0 0 1600 420" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="fmC" x1="0" x2="1"><stop offset="0" stopColor="#fcca33" /><stop offset=".5" stopColor="#89c93c" /><stop offset="1" stopColor="#399933" /></linearGradient>
          <linearGradient id="fmD" x1="0" x2="1"><stop offset="0" stopColor="#ef1c25" /><stop offset=".5" stopColor="#f2592a" /><stop offset="1" stopColor="#feb140" /></linearGradient>
        </defs>
        <path d="M0 420 V250 C260 170 520 330 840 290 C1120 255 1360 140 1600 200 V420 Z" fill="url(#fmC)" opacity=".8" />
        <path d="M0 420 V330 C300 290 600 400 900 360 C1200 320 1400 260 1600 300 V420 Z" fill="url(#fmD)" opacity=".55" />
      </svg>
      <img className="fondo-marca__botella fondo-marca__botella--1" src="/assets/img/productos/p01.webp" alt="" loading="lazy" decoding="async" />
      <img className="fondo-marca__botella fondo-marca__botella--2" src="/assets/img/productos/p36.webp" alt="" loading="lazy" decoding="async" />
      <img className="fondo-marca__botella fondo-marca__botella--3" src="/assets/img/productos/p61.webp" alt="" loading="lazy" decoding="async" />
    </div>
  );
}
