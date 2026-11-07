import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, mensajeError } from "@/lib/api";
import { data } from "@/data/data";
import { useCart } from "@/context/CartContext";
import { useUI } from "@/context/UIContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cat } from "@/lib/catalogo";
import { precio } from "@/lib/format";
import { wa } from "@/lib/whatsapp";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

const TIPOS = ["Tienda / estanco", "Bar o discoteca", "Restaurante", "Hotel", "Eventos", "Otro"];

/* Programa mayorista. El login se valida en el servidor (Argon2id, bloqueo por intentos, sesión HttpOnly).
   Las solicitudes de cuenta se guardan cifradas en el backend; WhatsApp queda como canal opcional. */
export default function Mayoristas() {
  usePageTitle("Ventas al por mayor · Licores Palmira");
  const { sesion, login, logout, add } = useCart();
  const { showToast } = useUI();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [solEstado, setSolEstado] = useState<{ ok: boolean; msg: string } | null>(null);
  const [autoriza, setAutoriza] = useState(false);
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [sol, setSol] = useState({ negocio: "", tipo: TIPOS[0], nombre: "", telefono: "", ciudad: "Palmira" });
  const zonaRef = useRef<HTMLElement>(null);
  const entro = useRef(false);

  useEffect(() => {
    if (sesion && entro.current) zonaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    entro.current = false;
  }, [sesion]);

  const onLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (enviando) return;
    setEnviando(true);
    try {
      entro.current = true;
      const u = await login(usuario.trim().toLowerCase(), clave);
      setError(null);
      showToast("Bienvenido, " + u.nombre, "badge-check");
      setUsuario("");
    } catch (err) {
      entro.current = false;
      setError(mensajeError(err));
    } finally {
      setClave("");
      setEnviando(false);
    }
  };

  const onSolicitud = async (e: FormEvent) => {
    e.preventDefault();
    if (!autoriza) {
      setSolEstado({ ok: false, msg: "Debes autorizar el tratamiento de tus datos para enviar la solicitud." });
      return;
    }
    try {
      const r = await api.post<{ mensaje: string }>("/mayoristas/solicitudes", { ...sol, autorizacionDatos: true });
      setSolEstado({ ok: true, msg: r.mensaje });
      setSol({ negocio: "", tipo: TIPOS[0], nombre: "", telefono: "", ciudad: "Palmira" });
      setAutoriza(false);
    } catch (err) {
      setSolEstado({ ok: false, msg: mensajeError(err) });
    }
  };

  const descargarCsv = () => {
    const csv =
      "Producto;Presentacion;Categoria;Precio mayorista\n" +
      data.productos.map((p) => [p.nombre, p.presentacion, cat(p.categoria)?.nombre, p.mayor].join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "lista-precios-mayorista-licores-palmira.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const items = data.productos.slice().sort((a, b) => ((cat(a.categoria)?.nombre || "") > (cat(b.categoria)?.nombre || "") ? 1 : -1));
  const setS = (k: keyof typeof sol) => (e: { target: { value: string } }) => setSol({ ...sol, [k]: e.target.value });

  return (
    <main>
      {/* Portal mayorista (v4, referencia del cliente): las dos tarjetas van de primeras */}
      <section className="seccion seccion--tight" id="ingresar">
        <div className="contenedor">
          <div className="mayor-grid">
            <Reveal className="mayor-card">
              <div className="seccion-title">
                <div className="seccion-title__kicker"><Icon name="user" size={14} wrap />Clientes registrados</div>
                <h2>Ingresar a la zona <em>mayorista</em></h2>
              </div>
              <p className="mayor-intro">Si ya eres cliente mayorista, inicia sesión para acceder a tu cuenta y gestionar tus pedidos.</p>
              <form className="mayor-form" noValidate onSubmit={onLogin}>
                <label className="campo">
                  <span className="campo__label"><Icon name="user" size={16} wrap />Usuario</span>
                  <input className="campo__input" name="usuario" type="text" autoComplete="username" placeholder="Ingresa tu usuario o correo" required value={usuario} onChange={(e) => setUsuario(e.target.value)} />
                </label>
                <label className="campo">
                  <span className="campo__label"><Icon name="lock" size={16} wrap />Contraseña</span>
                  <input className="campo__input" name="clave" type="password" autoComplete="current-password" placeholder="Ingresa tu contraseña" required maxLength={128} value={clave} onChange={(e) => setClave(e.target.value)} />
                </label>
                <p className="mayor-form__error" hidden={!error} role="alert">{error}</p>
                <button className="btn btn--rojo btn--lg btn--block" type="submit" disabled={enviando}><Icon name="lock" size={18} wrap />{enviando ? "Validando…" : "Entrar"}</button>
                <p className="mayor-form__links">
                  <a href={wa("pedido", "Hola, soy cliente mayorista y necesito recuperar mi acceso.")} target="_blank" rel="noopener">¿Olvidaste tu clave?</a>
                  <a href={wa("pedido", "Hola, soy cliente mayorista y necesito ayuda con mi cuenta.")} target="_blank" rel="noopener">
                    <Icon name="whatsapp" size={16} wrap />Escríbenos por WhatsApp
                  </a>
                </p>
              </form>
            </Reveal>
            <Reveal className="mayor-card mayor-card--sol" id="solicitar">
              <div className="mayor-card__head">
                <div className="seccion-title">
                  <div className="seccion-title__kicker"><Icon name="store" size={14} wrap />Nuevos negocios</div>
                  <h2>Solicitar cuenta <em>mayorista</em></h2>
                </div>
                <p>Cuéntanos de tu negocio y un asesor te contacta en el día para activar tu cuenta.</p>
              </div>
              <form className="mayor-form mayor-card__body" noValidate onSubmit={onSolicitud}>
                <label className="campo">
                  <span className="campo__label"><Icon name="store" size={16} wrap />Nombre del negocio</span>
                  <input className="campo__input" name="negocio" type="text" placeholder="Ej. Licorería La Estrella" required value={sol.negocio} onChange={setS("negocio")} />
                </label>
                <label className="campo">
                  <span className="campo__label"><Icon name="tag" size={16} wrap />Tipo</span>
                  <select className="campo__input" name="tipo" value={sol.tipo} onChange={setS("tipo")}>
                    {TIPOS.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
                <label className="campo">
                  <span className="campo__label"><Icon name="user" size={16} wrap />Nombre de contacto</span>
                  <input className="campo__input" name="nombre" type="text" placeholder="Ingresa el nombre del responsable" required value={sol.nombre} onChange={setS("nombre")} />
                </label>
                <label className="campo">
                  <span className="campo__label"><Icon name="whatsapp" size={16} wrap />WhatsApp</span>
                  <input className="campo__input" name="telefono" type="tel" inputMode="tel" placeholder="Ingresa tu número de WhatsApp" required value={sol.telefono} onChange={setS("telefono")} />
                </label>
                <label className="campo">
                  <span className="campo__label"><Icon name="map-pin" size={16} wrap />Ciudad</span>
                  <input className="campo__input" name="ciudad" type="text" value={sol.ciudad} onChange={setS("ciudad")} />
                </label>
                <label className="consentimiento">
                  <input type="checkbox" checked={autoriza} onChange={(e) => setAutoriza(e.target.checked)} />
                  <span>Autorizo a Licores Palmira S.A.S. a tratar mis datos para evaluar la solicitud y contactarme, según la <Link to="/ayuda#datos">Política de Tratamiento de Datos</Link> (Ley 1581 de 2012).</span>
                </label>
                {solEstado && <p className={solEstado.ok ? "form-ok" : "mayor-form__error"} role="status">{solEstado.msg}</p>}
                <button className="btn btn--verde btn--lg btn--block" type="submit"><Icon name="send" size={18} wrap />Solicitar cuenta</button>
              </form>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="seccion" hidden={!sesion} ref={zonaRef}>
        {sesion?.rol === "mayorista" && (
          <div className="contenedor">
            <div className="mayor-bienvenida reveal is-visible">
              <div>
                <div className="seccion-title__kicker" style={{ color: "var(--amarillo)" }}>Zona mayorista</div>
                <h2>Hola, <span>{sesion.nombre}</span> 👋</h2>
                <p>Estos son tus precios mayoristas. Añade al carrito y envía el pedido a tu asesor por WhatsApp.</p>
              </div>
              <div className="mayor-asesor">
                <Icon name="headset" size={26} wrap />
                <div>
                  <b>Tu asesor comercial</b>
                  <small>WhatsApp 321 867 7680 · Lun – Sáb 8:00 a.m. – 6:00 p.m.</small>
                </div>
                <a className="btn btn--wa btn--sm" href={wa("pedido", "Hola, soy cliente mayorista y quiero hacer un pedido.")} target="_blank" rel="noopener">Escribir</a>
              </div>
              <button className="btn btn--outline btn--sm" type="button" onClick={() => void logout().then(() => showToast("Sesión cerrada", "lock"))}>Salir</button>
            </div>
            <div className="catalogo__toolbar" style={{ marginTop: 22 }}>
              <div className="catalogo__count"><b>{items.length}</b> referencias con precio mayorista</div>
              <button className="btn btn--outline btn--sm" type="button" onClick={descargarCsv}><Icon name="file-text" size={16} wrap />Descargar lista de precios</button>
            </div>
            <div className="tabla-wrap">
              <table className="tabla tabla--mayor">
                <thead>
                  <tr><th>Producto</th><th>Presentación</th><th>Categoría</th><th>Precio detal</th><th>Tu precio</th><th></th></tr>
                </thead>
                <tbody>
                  {items.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nombre}</td>
                      <td>{p.presentacion}</td>
                      <td>{cat(p.categoria)?.corto}</td>
                      <td><s style={{ color: "var(--gris-500)" }}>{precio(p.detal)}</s></td>
                      <td><b style={{ color: "var(--verde)" }}>{precio(p.mayor)}</b></td>
                      <td>
                        <button className="btn btn--sm btn--outline" type="button" onClick={() => add(p.id, 1)}>
                          <Icon name="plus" size={14} />Añadir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      <section className="seccion seccion--alt">
        <div className="contenedor">
          <Reveal className="seccion-head">
            <div className="seccion-title seccion-title--center">
              <div className="seccion-title__kicker">Programa mayorista</div>
              <h2>Lo que recibes como <em>cliente mayorista</em></h2>
            </div>
          </Reveal>
          <Reveal className="bene-grid" stagger>
            <div className="bene bene--rojo"><Icon name="badge-percent" size={34} wrap /><b>Precio mayorista siempre</b><small>Sin mínimo de 10 unidades: tu cuenta ya tiene el precio exclusivo en todo el catálogo.</small></div>
            <div className="bene bene--naranja"><Icon name="headset" size={34} wrap /><b>Asesor asignado</b><small>Una persona que conoce tu negocio, te cotiza y te avisa de promociones antes que nadie.</small></div>
            <div className="bene bene--amarillo"><Icon name="truck" size={34} wrap /><b>Entrega programada</b><small>Flota propia. Pides hoy y recibes mañana en Palmira y municipios cercanos.</small></div>
            <div className="bene bene--verde"><Icon name="file-text" size={34} wrap /><b>Factura y crédito</b><small>Facturación electrónica y cupo de crédito para clientes recurrentes.</small></div>
          </Reveal>
        </div>
      </section>

      <section className="seccion">
        <div className="contenedor">
          <Reveal className="seccion-head">
            <div className="seccion-title seccion-title--center">
              <div className="seccion-title__kicker">Así de simple</div>
              <h2>Cómo <em>funciona</em></h2>
            </div>
          </Reveal>
          <Reveal className="pasos" stagger>
            <div className="paso"><span>1</span><b>Solicita tu cuenta</b><small>Un asesor valida tu negocio y la activa el mismo día.</small></div>
            <div className="paso"><span>2</span><b>Ingresa y pide</b><small>Ves precios mayoristas, armas el pedido y lo envías por WhatsApp.</small></div>
            <div className="paso"><span>3</span><b>Recibe en tu negocio</b><small>Entrega programada con flota propia y factura electrónica.</small></div>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
