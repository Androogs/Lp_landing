/* Política de Tratamiento de Datos (resumen) + formulario de derechos del titular (Ley 1581 de 2012, Decreto 1377 de 2013).
   El texto es una base técnica: debe revisarlo el área jurídica de la empresa antes de publicarse. */
import { useState, type FormEvent } from "react";
import { data } from "@/data/data";
import { api, mensajeError } from "@/lib/api";
import { Icon } from "@/components/ui/Icon";

const TIPOS = [
  ["consulta", "Consultar qué datos tienen de mí"],
  ["actualizacion", "Actualizar mis datos"],
  ["rectificacion", "Corregir mis datos"],
  ["supresion", "Eliminar mis datos"],
  ["revocatoria", "Revocar mi autorización"]
] as const;

export function PoliticaDatos() {
  const m = data.marca;
  return (
    <div style={{ marginTop: 16, color: "var(--texto-suave)", fontSize: 15, display: "grid", gap: 12 }}>
      <p><b>Responsable.</b> {m.razon}{m.nit ? `, NIT ${m.nit}` : ""}. {m.direccion}, {m.barrio}, {m.ciudad}. Correo {m.email} · Teléfono {m.telefono}.</p>
      <p><b>Qué datos tratamos y para qué.</b> Nombre, celular, correo (opcional) y dirección de entrega, únicamente para gestionar tu pedido, el pago, la entrega y la atención posventa; y, si eres negocio, para evaluar tu cuenta mayorista. No pedimos ni guardamos datos de tarjetas: el pago en línea lo procesa Wompi (Bancolombia) en su propia página.</p>
      <p><b>Cómo los protegemos.</b> Conexión cifrada (HTTPS), datos personales cifrados en nuestra base de datos, acceso restringido al personal autorizado con doble factor de autenticación y registro de cada consulta.</p>
      <p><b>Encargados.</b> Compartimos lo estrictamente necesario con la pasarela de pagos (Wompi) y con el proveedor de alojamiento del sitio, que actúan como encargados del tratamiento.</p>
      <p><b>Conservación.</b> Conservamos los datos de los pedidos el tiempo necesario para atenderlos y cumplir obligaciones legales; después se anonimizan.</p>
      <p><b>Tus derechos.</b> Conocer, actualizar, rectificar y suprimir tus datos, revocar la autorización, pedir prueba de ella y presentar quejas ante la Superintendencia de Industria y Comercio. Respondemos consultas en máximo 10 días hábiles y reclamos en máximo 15 días hábiles.</p>
    </div>
  );
}

export function FormHabeasData() {
  const [f, setF] = useState({ tipo: "consulta", nombre: "", telefono: "", email: "", detalle: "" });
  const [autoriza, setAutoriza] = useState(false);
  const [estado, setEstado] = useState<{ ok: boolean; msg: string } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!autoriza) return setEstado({ ok: false, msg: "Debes autorizar el tratamiento de tus datos para poder responderte." });
    setEnviando(true);
    try {
      const r = await api.post<{ radicado: string; plazo: string; mensaje: string }>("/privacidad/solicitudes", {
        tipo: f.tipo, nombre: f.nombre, detalle: f.detalle, telefono: f.telefono || undefined, email: f.email || undefined, autorizacionDatos: true
      });
      setEstado({ ok: true, msg: `${r.mensaje} Radicado ${r.radicado} · fecha límite de respuesta ${r.plazo}.` });
      setF({ tipo: "consulta", nombre: "", telefono: "", email: "", detalle: "" });
      setAutoriza(false);
    } catch (err) {
      setEstado({ ok: false, msg: mensajeError(err) });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="mayor-form mayor-card" style={{ marginTop: 20 }} onSubmit={onSubmit} noValidate>
      <h3 style={{ display: "flex", gap: 8, alignItems: "center" }}><Icon name="shield-check" size={20} />Ejercer mis derechos sobre mis datos</h3>
      <label className="campo"><span className="campo__label">Tipo de solicitud</span>
        <select className="campo__input" value={f.tipo} onChange={set("tipo")}>{TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label className="campo"><span className="campo__label">Nombre completo</span>
        <input className="campo__input" required minLength={3} maxLength={80} autoComplete="name" value={f.nombre} onChange={set("nombre")} /></label>
      <label className="campo"><span className="campo__label">Celular <small>(o correo)</small></span>
        <input className="campo__input" type="tel" inputMode="tel" maxLength={16} autoComplete="tel-national" value={f.telefono} onChange={set("telefono")} /></label>
      <label className="campo"><span className="campo__label">Correo <small>(o celular)</small></span>
        <input className="campo__input" type="email" maxLength={120} autoComplete="email" value={f.email} onChange={set("email")} /></label>
      <label className="campo"><span className="campo__label">Detalle de la solicitud</span>
        <textarea className="campo__input" rows={4} minLength={10} maxLength={1000} required value={f.detalle} onChange={set("detalle")} /></label>
      <label className="consentimiento">
        <input type="checkbox" checked={autoriza} onChange={(e) => setAutoriza(e.target.checked)} />
        <span>Autorizo el uso de estos datos solo para atender mi solicitud.</span>
      </label>
      {estado && <p className={estado.ok ? "form-ok" : "mayor-form__error"} role="status">{estado.msg}</p>}
      <button className="btn btn--rojo btn--lg" type="submit" disabled={enviando}><Icon name="send" size={18} wrap />{enviando ? "Enviando…" : "Radicar solicitud"}</button>
    </form>
  );
}
