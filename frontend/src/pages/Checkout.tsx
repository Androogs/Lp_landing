/* Checkout seguro.
   - Los precios que ves aquí son un ESTIMADO: el servidor recalcula todo con su propio catálogo.
   - El pago con tarjeta, PSE o Nequi se hace en la página de Wompi: esta web nunca recibe datos de tarjeta. */
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { data } from "@/data/data";
import { useCart } from "@/context/CartContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api, mensajeError, type PedidoCreado } from "@/lib/api";
import { precio } from "@/lib/format";
import { wa } from "@/lib/whatsapp";
import { Icon } from "@/components/ui/Icon";
import { ProductMedia } from "@/components/ui/ProductMedia";

const WOMPI_HOST = "checkout.wompi.co";

export default function Checkout() {
  usePageTitle("Finalizar pedido · Licores Palmira", { noindex: true });
  const { lines, total, items, clear, minimoPedidoMayor, faltanMinimoMayor } = useCart();
  const [f, setF] = useState({ nombre: "", telefono: "", email: "", direccion: "", barrio: "", notas: "" });
  const [metodo, setMetodo] = useState<"wompi" | "contraentrega">("wompi");
  const [autoriza, setAutoriza] = useState(false);
  const [mayor, setMayor] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listo, setListo] = useState<PedidoCreado | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando || faltanMinimoMayor > 0) return;
    if (!autoriza || !mayor) {
      setError("Para continuar confirma que eres mayor de 18 años y autoriza el tratamiento de tus datos.");
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      const r = await api.post<PedidoCreado>("/orders", {
        items: items.map(({ id, qty }) => ({ id, qty })),
        cliente: { nombre: f.nombre, telefono: f.telefono, email: f.email || undefined, direccion: f.direccion, barrio: f.barrio || undefined, notas: f.notas || undefined },
        metodo,
        autorizacionDatos: true,
        mayorDeEdad: true
      });
      if (r.pago) {
        // Defensa adicional: solo se redirige al dominio oficial de Wompi
        const u = new URL(r.pago.checkoutUrl);
        if (u.protocol !== "https:" || u.host !== WOMPI_HOST) throw new Error("destino de pago inesperado");
        window.location.assign(u.toString());
        return;
      }
      setListo(r);
      clear({ silencioso: true });
    } catch (err) {
      setError(mensajeError(err));
      setEnviando(false);
    }
  };

  if (listo) {
    return (
      <main className="contenedor checkout">
        <div className="checkout__ok">
          <Icon name="circle-check" size={48} />
          <h1>¡Pedido recibido!</h1>
          <p>Tu número de pedido es <b className="checkout__ref">{listo.reference}</b>. Guárdalo para hacer seguimiento.</p>
          <p>Total: <b>{precio(listo.total)}</b> · Pago contra entrega. Un asesor te escribe por WhatsApp para confirmar la hora de entrega.</p>
          <div className="checkout__acciones">
            <Link className="btn btn--rojo" to="/seguimiento">Seguir mi pedido</Link>
            <a className="btn btn--wa" href={wa("pedido", "Hola Licores Palmira, hice el pedido " + listo.reference + " en la web.")} target="_blank" rel="noopener">
              <Icon name="whatsapp" size={18} />Escribir al asesor
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (!lines.length) {
    return (
      <main className="contenedor checkout">
        <div className="catalogo__empty">
          <Icon name="shopping-bag" size={44} strokeWidth={1.4} />
          <b>Tu carrito está vacío</b>
          <span>Agrega productos para finalizar tu pedido.</span>
          <Link className="btn btn--rojo" to="/catalogo">Ver catálogo</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="contenedor checkout">
      <nav className="breadcrumb" aria-label="Ruta">
        <Link to="/">Inicio</Link>
        <Icon name="chevron-right" size={14} wrap />
        <span>Finalizar pedido</span>
      </nav>
      <div className="checkout__grid">
        <form className="checkout__form mayor-card" onSubmit={onSubmit} noValidate autoComplete="on">
          <div className="seccion-title">
            <div className="seccion-title__kicker">Datos de entrega</div>
            <h1 className="checkout__h">Finaliza tu <em>pedido</em></h1>
          </div>
          <div className="checkout__campos">
            <label className="campo"><span className="campo__label"><Icon name="user" size={16} wrap />Nombre completo</span>
              <input className="campo__input" name="name" autoComplete="name" required minLength={3} maxLength={80} value={f.nombre} onChange={set("nombre")} /></label>
            <label className="campo"><span className="campo__label"><Icon name="smartphone" size={16} wrap />Celular (WhatsApp)</span>
              <input className="campo__input" name="tel" type="tel" inputMode="tel" autoComplete="tel-national" required maxLength={16} placeholder="3XX XXX XXXX" value={f.telefono} onChange={set("telefono")} /></label>
            <label className="campo"><span className="campo__label"><Icon name="mail" size={16} wrap />Correo <small>(opcional)</small></span>
              <input className="campo__input" name="email" type="email" autoComplete="email" maxLength={120} value={f.email} onChange={set("email")} /></label>
            <label className="campo"><span className="campo__label"><Icon name="map-pin" size={16} wrap />Dirección de entrega</span>
              <input className="campo__input" name="address" autoComplete="street-address" required minLength={5} maxLength={160} value={f.direccion} onChange={set("direccion")} /></label>
            <label className="campo"><span className="campo__label"><Icon name="navigation" size={16} wrap />Barrio <small>(opcional)</small></span>
              <input className="campo__input" name="barrio" maxLength={80} value={f.barrio} onChange={set("barrio")} /></label>
            <label className="campo"><span className="campo__label"><Icon name="file-text" size={16} wrap />Notas para la entrega <small>(opcional)</small></span>
              <input className="campo__input" name="notas" maxLength={300} value={f.notas} onChange={set("notas")} /></label>
          </div>

          <div className="campo">
            <span className="campo__label"><Icon name="credit-card" size={16} wrap />¿Cómo quieres pagar?</span>
            <div className="calc-intens">
              <label className="calc-radio">
                <input type="radio" name="metodo" checked={metodo === "wompi"} onChange={() => setMetodo("wompi")} />
                <span><b>Pagar en línea</b><small>Tarjeta, PSE, Nequi u otros medios habilitados, en la página segura de Wompi</small></span>
              </label>
              <label className="calc-radio">
                <input type="radio" name="metodo" checked={metodo === "contraentrega"} onChange={() => setMetodo("contraentrega")} />
                <span><b>Contra entrega</b><small>Efectivo, QR o datáfono al recibir</small></span>
              </label>
            </div>
          </div>

          <label className="consentimiento">
            <input type="checkbox" checked={mayor} onChange={(e) => setMayor(e.target.checked)} />
            <span>Confirmo que soy <b>mayor de 18 años</b>. Prohibido el expendio de bebidas embriagantes a menores de edad (Ley 124 de 1994).</span>
          </label>
          <label className="consentimiento">
            <input type="checkbox" checked={autoriza} onChange={(e) => setAutoriza(e.target.checked)} />
            <span>Autorizo a Licores Palmira S.A.S. a tratar mis datos para gestionar mi pedido, pago y entrega, según la <Link to="/ayuda#datos">Política de Tratamiento de Datos</Link> (Ley 1581 de 2012).</span>
          </label>

          {faltanMinimoMayor > 0 && (
            <p className="minmayor" role="alert">
              <Icon name="boxes" size={16} wrap />
              La compra mayorista es desde <b>{minimoPedidoMayor} unidades</b> en total. Te faltan <b>{faltanMinimoMayor}</b>.
            </p>
          )}
          {error && <p className="mayor-form__error" role="alert">{error}</p>}
          <button className="btn btn--rojo btn--lg btn--block" type="submit" disabled={enviando || faltanMinimoMayor > 0}>
            <Icon name={metodo === "wompi" ? "lock" : "send"} size={18} wrap />
            {enviando ? "Procesando…" : metodo === "wompi" ? "Ir a pagar de forma segura" : "Confirmar pedido"}
          </button>
          <p className="checkout__seguro">
            <Icon name="shield-check" size={16} wrap />
            <span>Conexión cifrada. Tus datos se guardan cifrados y no se comparten con terceros distintos a la pasarela de pago. No guardamos datos de tarjetas.</span>
          </p>
        </form>

        <aside className="checkout__resumen mayor-card">
          <h2>Tu pedido</h2>
          {lines.map(({ item, p, unit, mayor: esMayor }) => (
            <div className="cart-item" key={p.id}>
              <div className="cart-item__media"><ProductMedia p={p} /></div>
              <div>
                <div className="cart-item__name">{p.nombre}</div>
                <div className="cart-item__pres">{p.presentacion} · {item.qty} und</div>
                {esMayor && <span className="cart-item__mayor">Precio mayorista</span>}
              </div>
              <b style={{ fontFamily: "var(--font-display)" }}>{precio(unit * item.qty)}</b>
            </div>
          ))}
          <div className="drawer__total"><span>Total estimado</span><b>{precio(total)}</b></div>
          <p className="calc-nota">El valor final lo confirma el sistema con los precios vigentes. Pedidos desde {data.marca.minimoMayor} unidades por referencia pagan precio mayorista.</p>
        </aside>
      </div>
    </main>
  );
}
