import { useState, type FormEvent } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api, mensajeError, type EstadoPedido } from "@/lib/api";
import type { CSSVars } from "@/lib/colores";
import { precio } from "@/lib/format";
import { wa } from "@/lib/whatsapp";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

const PASOS: [string, string, string, string][] = [
  ["#ef1c25", "clipboard-list", "1. Recibido", "Confirmamos tu pedido y el medio de pago por WhatsApp."],
  ["#f2592a", "package", "2. En preparación", "Bodega alista y revisa tu pedido con doble conteo."],
  ["#feb140", "bike", "3. En camino", "Un domiciliario de nuestra flota sale hacia tu dirección."],
  ["#399933", "circle-check", "4. Entregado", "Recibes, revisas y pagas si elegiste contra entrega."]
];

/* Seguimiento: se exigen número de pedido + celular. El servidor responde solo el estado (sin datos personales). */
export default function Seguimiento() {
  usePageTitle("Seguimiento de pedido · Licores Palmira");
  const [reference, setReference] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cargando, setCargando] = useState(false);
  const [estado, setEstado] = useState<EstadoPedido | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (cargando) return;
    setCargando(true);
    setError(null);
    setEstado(null);
    try {
      setEstado(await api.post<EstadoPedido>("/orders/track", { reference: reference.trim().toUpperCase(), telefono }));
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <main>
      <section className="page-hero page-hero--corp page-hero--corta">
        <div className="contenedor page-hero__inner">
          <div className="seccion-title seccion-title--light"><div className="seccion-title__kicker">Seguimiento de pedido</div></div>
          <h1>¿Dónde va mi <em>pedido</em>?</h1>
          <p>Escribe el número de pedido (LP-…) y el celular con el que lo hiciste. Por seguridad pedimos los dos datos.</p>
        </div>
      </section>

      <section className="seccion">
        <div className="contenedor" style={{ maxWidth: 900 }}>
          <Reveal as="form" className="seg-form" noValidate onSubmit={onSubmit}>
            <label className="campo" style={{ flex: 1 }}>
              <span className="campo__label"><Icon name="package" size={16} wrap />Número de pedido</span>
              <input className="campo__input" name="reference" type="text" autoComplete="off" placeholder="Ej. LP-7K2M9Q4XTA" required maxLength={13} value={reference} onChange={(e) => setReference(e.target.value)} />
            </label>
            <label className="campo" style={{ flex: 1 }}>
              <span className="campo__label"><Icon name="smartphone" size={16} wrap />Celular del pedido</span>
              <input className="campo__input" name="telefono" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="3XX XXX XXXX" required maxLength={16} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </label>
            <button className="btn btn--rojo btn--lg" type="submit" disabled={cargando}><Icon name="search" size={18} wrap />{cargando ? "Consultando…" : "Consultar"}</button>
          </Reveal>

          <Reveal className="seg-estado" hidden={!estado && !error}>
            {estado && (
              <div className="seg-card seg-card--ok">
                <span className="seg-card__ico"><Icon name={estado.paso >= 4 ? "circle-check" : "package"} size={26} /></span>
                <div>
                  <b>{estado.reference} · {estado.etiqueta}</b>
                  <small>Total {precio(estado.total)} · Realizado el {new Date(estado.creado).toLocaleDateString("es-CO")}</small>
                </div>
              </div>
            )}
            {error && (
              <div className="seg-card">
                <span className="seg-card__ico"><Icon name="info" size={26} /></span>
                <div>
                  <b>{error}</b>
                  <small>Si hiciste el pedido por WhatsApp, tu asesor te confirma el estado.</small>
                  <a className="btn btn--wa" style={{ marginTop: 10 }} href={wa("pedido", "Hola Licores Palmira, quiero saber el estado de mi pedido.")} target="_blank" rel="noopener">
                    <Icon name="whatsapp" size={18} />Preguntar por WhatsApp
                  </a>
                </div>
              </div>
            )}
          </Reveal>

          <Reveal className="seg-pasos" stagger style={{ marginTop: 32 }}>
            {PASOS.map(([c, ico, b, s], i) => (
              <div className={"seg-paso" + (estado && estado.paso >= i + 1 ? " is-done" : "")} key={b}>
                <span className="seg-paso__ico" style={{ "--c": c } as CSSVars}><Icon name={ico} size={24} wrap /></span>
                <b>{b}</b>
                <small>{s}</small>
              </div>
            ))}
          </Reveal>

          <div className="calc-tips" style={{ marginTop: 26 }}>
            <Icon name="info" size={16} wrap />
            <span>Los pedidos a domicilio en Palmira se entregan el mismo día si se confirman antes de las 6:00 p.m. Los pedidos mayoristas se programan con tu asesor.</span>
          </div>
        </div>
      </section>
    </main>
  );
}
