import { Fragment, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { data } from "@/data/data";
import { useCart } from "@/context/CartContext";
import { useUI } from "@/context/UIContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { producto } from "@/lib/catalogo";
import { mlDe, precio } from "@/lib/format";
import { readStore, writeStore } from "@/lib/storage";
import type { Producto } from "@/types";
import { Icon } from "@/components/ui/Icon";
import { ProductMedia } from "@/components/ui/ProductMedia";
import { Reveal } from "@/components/ui/Reveal";
import { Qty } from "@/components/ui/Qty";

const C = data.calculadora;
const MIN_MAYOR = data.marca.minimoMayor;
const LS_KEY = "lp_calculadora";

interface Fila {
  key: string;
  grupo: "licor" | "mezclador" | "extra";
  nombre: string;
  icono: string;
  p: Producto;
  qty: number;
  opciones?: Producto[];
  nota: string;
  agotado?: boolean;
}

interface CalcState {
  evento: string;
  fecha: string;
  personas: string;
  horas: string;
  intensidad: string;
  sel: string[];
  bebedores: string;
  elegido: Record<string, string>;
  ajuste: Record<string, number>;
}

const productosDe = (categoria: string) => data.productos.filter((p) => p.categoria === categoria).sort((a, b) => a.detal - b.detal);

const emptyState: CalcState = {
  evento: C.eventos[0].id,
  fecha: "",
  personas: "30",
  horas: "5",
  intensidad: C.intensidades[1].id,
  sel: C.seleccionInicial.slice(),
  bebedores: "",
  elegido: {},
  ajuste: {},
};

function loadState(): CalcState {
  try {
    const raw = readStore<string>(LS_KEY);
    if (raw) return { ...emptyState, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return emptyState;
}

function saveState(s: CalcState) {
  try { writeStore(LS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export default function Calculadora() {
  usePageTitle("Calculadora de licor para eventos · Licores Palmira");
  const { add, esMayor, unitPrice, precioLista } = useCart();
  const { openCart, showToast } = useUI();
  const [params] = useSearchParams();

  const persisted = loadState();
  const [evento, setEvento] = useState(params.get("evento") || persisted.evento);
  const [fecha, setFecha] = useState(params.get("fecha") || persisted.fecha);
  const [personas, setPersonas] = useState(params.get("personas") || persisted.personas);
  const [horas, setHoras] = useState(params.get("horas") || persisted.horas);
  const [intensidad, setIntensidad] = useState(params.get("intensidad") || persisted.intensidad);
  const [sel, setSel] = useState(() => {
    const fromUrl = params.get("licores");
    if (fromUrl) return fromUrl.split(",").filter(Boolean);
    return persisted.sel;
  });
  const [bebedores, setBebedores] = useState(params.get("bebedores") || persisted.bebedores);
  const [elegido, setElegido] = useState<Record<string, string>>({ ...persisted.elegido });
  const [ajuste, setAjuste] = useState<Record<string, number>>({ ...persisted.ajuste });
  const [mostrar, setMostrar] = useState(!!params.get("personas") || !!readStore<string>(LS_KEY));
  const [print, setPrint] = useState(false);

  useEffect(() => {
    const s: CalcState = { evento, fecha, personas, horas, intensidad, sel, bebedores, elegido, ajuste };
    saveState(s);
  }, [evento, fecha, personas, horas, intensidad, sel, bebedores, elegido, ajuste]);

  const r = useMemo(() => {
    const nPers = Math.max(1, +personas || 0);
    const nBeb = Math.max(0, Math.min(nPers, +bebedores || 0));
    const nHoras = Math.max(1, +horas || 0);
    const ev = C.eventos.find((e) => e.id === evento) || C.eventos[0];
    const inten = C.intensidades.find((x) => x.id === intensidad) || C.intensidades[1];
    const tragosPP = Math.max(1, Math.round(nHoras * inten.factor * ev.factor));
    const total = nBeb * tragosPP;
    const licores = C.licores.filter((l) => sel.includes(l.id));
    const filas: Fila[] = [];
    licores.forEach((l) => {
      const opciones = productosDe(l.categoria);
      const p = producto(elegido[l.id]) || producto(l.sugerido) || opciones[0];
      if (!p) return;
      const share = total / licores.length;
      let qty: number;
      if (l.porUnidad) qty = Math.ceil(share);
      else {
        const porBotella = Math.max(1, Math.floor(mlDe(p.presentacion) / (l.mlTrago || 45)));
        qty = Math.ceil(share / porBotella);
      }
      if (ajuste[l.id] != null) qty = ajuste[l.id];
      filas.push({
        key: l.id, grupo: "licor", nombre: l.nombre, icono: l.icono, p, qty, opciones,
        nota: l.porUnidad ? "1 unidad por trago" : Math.floor(mlDe(p.presentacion) / (l.mlTrago || 45)) + " tragos por botella",
        agotado: p.stock === "agotado"
      });
      if (l.mezclador) {
        const mx = producto(l.mezclador);
        if (mx) {
          const mlPorTrago = l.mlTrago || 45;
          const totalMlLicor = total * mlPorTrago;
          const mlMix = totalMlLicor * C.extras.mezclaPartes;
          let q2 = Math.ceil(mlMix / mlDe(mx.presentacion));
          if (ajuste["mx-" + l.id] != null) q2 = ajuste["mx-" + l.id];
          filas.push({ key: "mx-" + l.id, grupo: "mezclador", nombre: "Mezclador para " + l.nombre.toLowerCase(), icono: "cup-soda", p: mx, qty: q2, nota: C.extras.mezclaPartes + " partes de mezclador por 1 de licor", agotado: mx.stock === "agotado" });
        }
      }
    });
    const agua = producto(C.extras.aguaProducto);
    const snack = producto(C.extras.snackProducto);
    if (agua) filas.push({ key: "agua", grupo: "extra", nombre: "Agua", icono: "droplets", p: agua, qty: ajuste.agua != null ? ajuste.agua : 0, nota: "Recomendado: " + Math.ceil(nBeb * C.extras.aguaPorPersona) + " · media botella por persona", agotado: agua.stock === "agotado" });
    if (snack) filas.push({ key: "snack", grupo: "extra", nombre: "Pasabocas", icono: "popcorn", p: snack, qty: ajuste.snack != null ? ajuste.snack : 0, nota: "Recomendado: " + Math.ceil(nBeb / C.extras.snackCadaPersonas) + " · 1 paquete cada " + C.extras.snackCadaPersonas + " personas", agotado: snack.stock === "agotado" });

    /* Desechables como líneas de pedido (solo se suman si el usuario asigna cantidad) */
    const vasosProd = producto("p106"); /* Vasos desechables 10 oz x50 */
    const hieloProd = producto("p108"); /* Hielo en bolsa 5 kg */
    const servilletasProd = producto("p109"); /* Servilletas x100 */
    if (vasosProd) {
      const vasosQty = Math.ceil(nBeb * C.extras.vasosPorPersona / 50);
      filas.push({ key: "vasos", grupo: "extra", nombre: "Vasos desechables 10 oz", icono: "cup-soda", p: vasosProd, qty: ajuste.vasos != null ? ajuste.vasos : 0, nota: "Recomendado: " + vasosQty + " pack(s) · " + C.extras.vasosPorPersona + " vasos por persona", agotado: vasosProd.stock === "agotado" });
    }
    if (hieloProd) {
      const hieloQty = Math.ceil(nBeb * C.extras.hieloKgPorPersona / 5);
      filas.push({ key: "hielo", grupo: "extra", nombre: "Hielo en bolsa", icono: "snowflake", p: hieloProd, qty: ajuste.hielo != null ? ajuste.hielo : 0, nota: "Recomendado: " + hieloQty + " bolsa(s) · " + C.extras.hieloKgPorPersona + " kg por persona", agotado: hieloProd.stock === "agotado" });
    }
    if (servilletasProd) {
      const servQty = Math.ceil(nBeb / 20);
      filas.push({ key: "servilletas", grupo: "extra", nombre: "Servilletas", icono: "message-circle", p: servilletasProd, qty: ajuste.servilletas != null ? ajuste.servilletas : 0, nota: "Recomendado: " + servQty + " pack(s) · 1 servilleta cada 20 personas", agotado: servilletasProd.stock === "agotado" });
    }

    const totalCop = filas.reduce((s, f) => s + unitPrice(f.p, f.qty) * f.qty, 0);
    const ahorro = filas.reduce((s, f) => s + (f.p.detal - unitPrice(f.p, f.qty)) * f.qty, 0);
    const costoPersona = nBeb > 0 ? totalCop / nBeb : 0;
    return {
      personas: nPers, bebedores: nBeb, bebedoresCount: nBeb, horas: nHoras, ev, tragosPP, total, filas, totalCop, ahorro, costoPersona,
      hielo: Math.ceil(nBeb * C.extras.hieloKgPorPersona), vasos: nBeb * C.extras.vasosPorPersona
    };
  }, [personas, bebedores, horas, evento, intensidad, sel, elegido, ajuste, unitPrice]);

  const waCalc = useCallback(() => {
    const lines = ["Hola Licores Palmira, quiero cotizar licor para un evento:", "• " + r.ev.nombre + " · " + r.personas + " personas · " + r.bebedoresCount + " bebedores · " + r.horas + " horas", "", "Productos:"];
    r.filas.forEach((f) => f.qty > 0 && lines.push("• " + f.qty + " x " + f.p.nombre + " " + f.p.presentacion + " — " + precio(unitPrice(f.p, f.qty) * f.qty)));
    lines.push("", "Hielo aprox. " + r.hielo + " kg y vasos para " + r.vasos + " personas", "", "Total estimado: " + precio(r.totalCop), "Costo por persona: " + precio(r.costoPersona), "", "Fecha del evento:" + (fecha ? " " + fecha : ""), "Dirección de entrega:");
    return "https://wa.me/" + data.marca.whatsapp + "?text=" + encodeURIComponent(lines.join("\n"));
  }, [r, fecha, unitPrice]);

  const cambio = useCallback(<T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setAjuste({});
  }, []);

  const toggleLicor = (id: string) => {
    if (sel.includes(id)) {
      if (sel.length === 1) { showToast("Elige al menos un licor", "info"); return; }
      setSel(sel.filter((x) => x !== id));
    } else setSel([...sel, id]);
    setAjuste({});
  };

  const step = useCallback((campo: "personas" | "horas", delta: number) => {
    const set = campo === "personas" ? setPersonas : setHoras;
    const val = campo === "personas" ? personas : horas;
    cambio(set)(String(Math.max(1, (+val || 0) + delta)));
  }, [personas, horas, cambio]);

  const setBebedoresStep = useCallback((delta: number) => {
    setBebedores((v) => String(Math.max(0, Math.min(+personas || 0, (+v || 0) + delta))));
    setAjuste({});
  }, [personas]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setAjuste({});
    setMostrar(true);
  };

  const resetCalc = () => {
    setSel(C.seleccionInicial.slice());
    setPersonas("30");
    setHoras("5");
    setIntensidad(C.intensidades[1].id);
    setBebedores("");
    setFecha("");
    setElegido({});
    setAjuste({});
    setMostrar(false);
    showToast("Calculadora reiniciada", "refresh-ccw");
  };

  const fila = (f: Fila) => {
    const u = unitPrice(f.p, f.qty);
    const mayor = esMayor || f.qty >= MIN_MAYOR;
    const lineTotal = u * f.qty;
    return (
      <div className="calc-row" key={f.key}>
        <div className="calc-row__media"><ProductMedia p={f.p} /></div>
        <div className="calc-row__main">
          <div className="calc-row__kind"><Icon name={f.icono} size={14} />{f.nombre}</div>
          {f.opciones ? (
            <select className="calc-row__select" aria-label={"Producto de " + f.nombre} value={f.p.id} onChange={(e) => {
              setElegido({ ...elegido, [f.key]: e.target.value });
              const a = { ...ajuste }; delete a[f.key]; delete a["mx-" + f.key]; setAjuste(a);
            }}>
              {f.opciones.map((o) => (
                <option key={o.id} value={o.id}>{o.nombre + " · " + o.presentacion + " · " + precio(precioLista(o))}{o.stock === "agotado" && " (agotado)"}</option>
              ))}
            </select>
          ) : (
            <div className="calc-row__name">{f.p.nombre} · {f.p.presentacion}</div>
          )}
          <div className="calc-row__note">
            {f.nota}
            {f.agotado && <span className="calc-row__stock">· AGOTADO</span>}
            {mayor && <> · <b style={{ color: "var(--verde)" }}>precio mayorista</b></>}
          </div>
        </div>
        <div className="calc-row__right">
          <Qty value={f.qty} onChange={(v) => setAjuste({ ...ajuste, [f.key]: v })} min={0} />
          <div className="calc-row__price">
            <b>{precio(lineTotal)}</b>
            <small>{precio(u)} c/u</small>
          </div>
        </div>
      </div>
    );
  };

  const grupos: [Fila["grupo"], string][] = [["licor", "Licor"], ["mezclador", "Mezcladores"], ["extra", "Extras y desechables"]];

  return (
    <main className={print ? "calc-print" : undefined}>
      {!print && (
        <>
          <section className="calc-hero">
            <div className="contenedor calc-hero__inner">
              <div className="calc-hero__pad">
                <div className="seccion-title seccion-title--light"><div className="seccion-title__kicker">Calculadora de eventos</div></div>
                <h1>¿Cuánto licor necesita <em>tu evento</em>?</h1>
                <p>Dinos cuántas personas van, cuántas horas dura y qué toman. Te decimos cuántas botellas, cervezas, mezcladores, hielo, vasos y pasabocas comprar, con el precio real de la tienda.</p>
              </div>
              <div className="calc-hero__bottles" aria-hidden="true">
                {["p27", "p01", "p17", "p02", "p63"].map((id) => (
                  <span key={id}><img src={"/assets/img/productos/" + id + ".webp"} alt="" /></span>
                ))}
              </div>
            </div>
          </section>

          <section className="seccion seccion--tight">
            <div className="contenedor">
              <Reveal className="calc-steps" stagger>
                <div className="calc-step"><span>1</span><b>Cuéntanos del evento</b><small>Tipo, personas y duración.</small></div>
                <div className="calc-step"><span>2</span><b>Elige qué se toma</b><small>Cerveza, aguardiente, ron, whisky…</small></div>
                <div className="calc-step"><span>3</span><b>Recibe tu lista</b><small>Cantidades, precio y pedido listo por WhatsApp.</small></div>
              </Reveal>

              <div className="calc">
                <Reveal as="form" className="calc-form" noValidate onSubmit={onSubmit}>
                  <div className="calc-form__grid">
                    <label className="campo">
                      <span className="campo__label"><Icon name="party-popper" size={16} wrap />Tipo de evento</span>
                      <select name="evento" className="campo__input" value={evento} onChange={(e) => { cambio(setEvento)(e.target.value); setAjuste({}); }}>
                        {C.eventos.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                      </select>
                    </label>
                    <label className="campo">
                      <span className="campo__label"><Icon name="calendar" size={16} wrap />Fecha (opcional)</span>
                      <input type="date" name="fecha" className="campo__input" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                    </label>
                    <div className="campo">
                      <span className="campo__label"><Icon name="users" size={16} wrap />Número de personas</span>
                      <div className="stepper">
                        <button type="button" aria-label="Menos personas" onClick={() => step("personas", -5)}><Icon name="minus" size={16} wrap /></button>
                        <input type="number" name="personas" min={1} max={2000} inputMode="numeric" required value={personas} onChange={(e) => cambio(setPersonas)(e.target.value)} />
                        <button type="button" aria-label="Más personas" onClick={() => step("personas", 5)}><Icon name="plus" size={16} wrap /></button>
                      </div>
                    </div>
                    <div className="campo">
                      <span className="campo__label"><Icon name="clock" size={16} wrap />Duración (horas)</span>
                      <div className="stepper">
                        <button type="button" aria-label="Menos horas" onClick={() => step("horas", -1)}><Icon name="minus" size={16} wrap /></button>
                        <input type="number" name="horas" min={1} max={24} inputMode="numeric" required value={horas} onChange={(e) => cambio(setHoras)(e.target.value)} />
                        <button type="button" aria-label="Más horas" onClick={() => step("horas", 1)}><Icon name="plus" size={16} wrap /></button>
                      </div>
                    </div>
                  </div>

                  <div className="campo calc-bebedores">
                    <span className="campo__label"><Icon name="wine" size={16} wrap />Personas que beberán</span>
                    <div className="stepper">
                      <button type="button" aria-label="Menos" onClick={() => setBebedoresStep(-1)}><Icon name="minus" size={16} wrap /></button>
                      <input type="number" name="bebedores" min={0} max={2000} inputMode="numeric" required value={bebedores} onChange={(e) => { cambio(setBebedores)(e.target.value); }} />
                      <button type="button" aria-label="Más" onClick={() => setBebedoresStep(1)}><Icon name="plus" size={16} wrap /></button>
                    </div>
                    <span className="calc-bebedores__hint">{(+personas || 0) - (+bebedores || 0)} no beberán</span>
                  </div>

                  <div className="campo">
                    <span className="campo__label"><Icon name="flame" size={16} wrap />¿Cómo es tu gente?</span>
                    <div className="calc-intens">
                      {C.intensidades.map((x) => (
                        <label className="calc-radio" key={x.id}>
                          <input type="radio" name="intensidad" value={x.id} checked={intensidad === x.id} onChange={() => { cambio(setIntensidad)(x.id); }} />
                          <span><b>{x.nombre}</b><small>{x.texto}</small></span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="campo">
                    <span className="campo__label"><Icon name="wine" size={16} wrap />¿Qué se toma? <small>(elige uno o varios)</small></span>
                    <div className="calc-licores">
                      {C.licores.map((l) => {
                        const on = sel.includes(l.id);
                        return (
                          <button key={l.id} type="button" className={"calc-licor" + (on ? " is-on" : "")} aria-pressed={on} onClick={() => toggleLicor(l.id)}>
                            <Icon name={l.icono} size={22} />
                            <span>{l.nombre}</span>
                            <Icon name="check" size={14} className="calc-licor__check" />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="calc-form__actions">
                    <button type="button" className="btn btn--outline" onClick={resetCalc}><Icon name="refresh-cw" size={16} wrap />Reiniciar</button>
                    <button className="btn btn--rojo btn--lg" type="submit"><Icon name="calculator" size={18} wrap />Calcular mi evento</button>
                    <span className="calc-form__hint">Gratis y sin compromiso. Luego ajustas lo que quieras.</span>
                  </div>
                </Reveal>

                <div className="calc-out" hidden={!mostrar}>
                  {mostrar && (
                    <>
                      <div className="calc-sum">
                        <div className="calc-sum__item"><b>{r.personas}</b><span>personas invitadas</span></div>
                        <div className="calc-sum__item"><b>{r.bebedoresCount}</b><span>bebedores</span></div>
                        <div className="calc-sum__item"><b>{Math.round(r.tragosPP * 10) / 10}</b><span>tragos por persona</span></div>
                        <div className="calc-sum__item"><b>{Math.round(r.total)}</b><span>tragos en total</span></div>
                      </div>
                      {grupos.map(([g, titulo]) => {
                        const fs = r.filas.filter((f) => f.grupo === g);
                        return fs.length ? (
                          <Fragment key={g}>
                            <h3 className="calc-group">{titulo}</h3>
                            {fs.map(fila)}
                          </Fragment>
                        ) : null;
                      })}
                      <div className="calc-tips">
                        <Icon name="snowflake" size={16} />
                        <span><b>Hielo:</b> unos {r.hielo} kg · <b>Vasos:</b> {r.vasos} aprox. Edita las cantidades arriba si los necesitas.</span>
                      </div>
                      <div className="calc-total">
                        <div>
                          <span>Total estimado</span>
                          <b>{precio(r.totalCop)}</b>
                          {r.ahorro > 0 && <small>Ahorras {precio(r.ahorro)} con precio mayorista</small>}
                          <div style={{ fontSize: "13px", color: "var(--texto-suave)", marginTop: "4px" }}>Costo por persona: <b>{precio(r.costoPersona)}</b></div>
                        </div>
                        <div className="calc-total__actions">
                          <button className="btn btn--rojo btn--lg" type="button" onClick={() => { r.filas.forEach((f) => f.qty > 0 && add(f.p.id, f.qty)); openCart(); }}>
                            <Icon name="shopping-cart" size={18} />
                            Añadir todo al carrito
                          </button>
                          <a className="btn btn--wa btn--lg" href={waCalc()} target="_blank" rel="noopener">
                            <Icon name="whatsapp" size={18} />
                            Cotizar por WhatsApp
                          </a>
                          <button className="btn btn--outline btn--lg" type="button" onClick={() => { setPrint(true); window.print(); setPrint(false); }}>
                            <Icon name="printer" size={18} />
                            Imprimir resumen
                          </button>
                        </div>
                      </div>
                      <p className="calc-nota">Cálculo orientativo con base en el consumo promedio en Colombia. Ajusta cantidades y productos según tu gente; el precio final se confirma al hacer el pedido.</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {print && (
        <section className="calc-print-view">
          <div className="contenedor">
            <h2>Resumen del cálculo · Licores Palmira</h2>
            <p>{r.ev.nombre} · {r.personas} personas · {r.bebedoresCount} bebedores · {r.horas} horas</p>
            <p>Fecha: {fecha || "No especificada"} · Total estimado: <b>{precio(r.totalCop)}</b> · Costo por persona: <b>{precio(r.costoPersona)}</b></p>
            <table>
              <thead><tr><th>Producto</th><th>Presentación</th><th>Qty</th><th>Precio c/u</th><th>Total</th></tr></thead>
              <tbody>
                {r.filas.filter((f) => f.qty > 0).map((f) => (
                  <tr key={f.key}>
                    <td>{f.p.nombre}</td>
                    <td>{f.p.presentacion}</td>
                    <td>{f.qty}</td>
                    <td>{precio(unitPrice(f.p, f.qty))}</td>
                    <td>{precio(unitPrice(f.p, f.qty) * f.qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: "16px", fontWeight: "700" }}>Total: {precio(r.totalCop)}</p>
            <p style={{ fontSize: "12px", color: "var(--texto-suave)" }}>Cálculo orientativo de Licores Palmira. Precio final sujeto a confirmación al momento del pedido.</p>
          </div>
        </section>
      )}
    </main>
  );
}
