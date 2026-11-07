import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useUI } from "@/context/UIContext";
import { wa } from "@/lib/whatsapp";
import { Icon } from "@/components/ui/Icon";
import { MegaMenu } from "./MegaMenu";
import { SearchBar } from "./SearchBar";

const NAV: [string, string][] = [
  ["/", "Inicio"],
  ["/catalogo", "Catálogo"],
  ["/calculadora", "Calculadora"]
];

/** Contador del carrito con la animación .bump al añadir */
export function CartBadge() {
  const { count, bumpKey } = useCart();
  const [bump, setBump] = useState(false);
  useEffect(() => {
    if (!bumpKey) return;
    setBump(false);
    const id = requestAnimationFrame(() => setBump(true));
    return () => cancelAnimationFrame(id);
  }, [bumpKey]);
  return <span className={"icon-btn__badge" + (count > 0 ? " is-on" : "") + (bump ? " bump" : "")}>{count}</span>;
}

/** Interruptor Detal / Mayor que refleja y cambia el modo de precios elegido en la puerta de entrada */
export function PriceModeSwitch() {
  const { esMayor, setModo } = useCart();
  return (
    <div className="pricemode" role="group" aria-label="Modo de precios">
      <button className={"pricemode__btn" + (!esMayor ? " is-on" : "")} type="button" aria-pressed={!esMayor} onClick={() => setModo("regular")}>
        <Icon name="store" size={14} />
        Detal
      </button>
      <button className={"pricemode__btn pricemode__btn--mayor" + (esMayor ? " is-on" : "")} type="button" aria-pressed={esMayor} onClick={() => setModo("mayorista")}>
        <Icon name="boxes" size={14} />
        Mayor
      </button>
    </div>
  );
}

export function Header() {
  const { openCart, openMobileNav } = useUI();
  return (
    <>
      <div className="linea-marca"></div>
      <header className="header" id="header">
        <div className="contenedor header__inner has-search-row">
          <Link className="header__logo" to="/" aria-label="Licores Palmira, inicio">
            <img src="/assets/marca/logo-blanco.webp" alt="Licores Palmira" width={720} height={564} />
          </Link>
          <div className="header__center">
            <SearchBar />
          </div>
          <div className="header__right">
            <PriceModeSwitch />
            <nav className="header__nav" aria-label="Principal">
              {NAV.map(([to, label]) => (
                <NavLink key={to} to={to} end className={({ isActive }) => (isActive ? "is-active" : undefined)}>
                  {label}
                </NavLink>
              ))}
            </nav>
            <button className="icon-btn" type="button" aria-label="Abrir carrito" onClick={openCart}>
              <Icon name="shopping-cart" size={22} />
              <CartBadge />
            </button>
            <a className="btn btn--wa btn--sm header__wa" href={wa("pedido")} target="_blank" rel="noopener">
              <Icon name="whatsapp" size={18} />
              Pedir
            </a>
            <button className="icon-btn header__burger" type="button" aria-label="Abrir menú" onClick={openMobileNav}>
              <Icon name="menu" size={24} />
            </button>
          </div>
        </div>
      </header>
      <MegaMenu />
    </>
  );
}
