/* Espacios publicitarios para marcas (uso comercial interno, noindex, sin enlaces desde la web).
   v4: el cliente pidió retirar el hero "Para marcas y distribuidores" y la demo del carrusel. */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { data } from "@/data/data";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { CSSVars } from "@/lib/colores";
import { precio } from "@/lib/format";
import { KEYS, readStore } from "@/lib/storage";
import type { PautaStats } from "@/lib/tracking";
import { wa } from "@/lib/whatsapp";
import type { EspacioPauta } from "@/types";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";

interface FilaStats { banner: string; imp: number; clic: number; ctr: number }
interface Informe { mes: string; generado: string; banners: FilaStats[]; totales: { impresiones: number; clics: number; ctr: number } }

function nombreBanner(id: string) {
  const b = (data.pauta.banners || []).find((x) => x.id === id);
  return b ? b.marca + " · " + (b.titulo || "") : id;
}

function Tabla({ filas, titulo }: { filas: FilaStats[]; titulo?: string }) {
  return (
    <>
      {titulo && <div className="tabla-titulo">{titulo}</div>}
      <table className="tabla">
        <thead>
          <tr><th>Banner</th><th>Impresiones</th><th>Clics</th><th>CTR</th></tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.banner}>
              <td>
                {nombreBanner(f.banner)}
                <br />
                <small style={{ color: "var(--gris-500)", fontWeight: 400 }}>{f.banner}</small>
              </td>
              <td>{f.imp}</td>
              <td>{f.clic}</td>
              <td>{f.ctr}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function AdSlotCard({ e }: { e: EspacioPauta }) {
  return (
    <article className={"espacio" + (e.top ? " espacio--top" : "")}>
      {e.top && <span className="badge badge--vendido">Más visto</span>}
      <h3>{e.nombre}</h3>
      <div className="espacio__precio">{precio(e.precio)}<small>/ mes</small></div>
      <p>{e.texto}</p>
      <div className="espacio__fmt"><Icon name="image" size={15} />{e.formato}</div>
      <a className="btn btn--outline btn--sm btn--block" href={wa("pedido", "Hola Licores Palmira, mi marca quiere pautar en: " + e.nombre + ".")} target="_blank" rel="noopener">
        <Icon name="whatsapp" size={15} />Reservar este espacio
      </a>
    </article>
  );
}

function StatsLocales() {
  const stats = readStore<PautaStats>(KEYS.pautaStats) || {};
  const ids = Object.keys(stats);
  if (!ids.length) return <p className="muted">Aún no hay datos en este navegador. Abre la portada y vuelve.</p>;
  const filas = ids.map((id) => {
    const s = stats[id];
    return { banner: id, imp: s.imp || 0, clic: s.clic || 0, ctr: s.imp ? Math.round(((s.clic || 0) / s.imp) * 1000) / 10 : 0 };
  });
  return <Tabla filas={filas} titulo="Datos de este navegador (sin servidor conectado)" />;
}

function Informe() {
  const [params] = useSearchParams();
  const mes = params.get("mes");
  const url = data.pauta.informeUrl;
  const [estado, setEstado] = useState<"cargando" | "local" | Informe>(url ? "cargando" : "local");

  useEffect(() => {
    if (!url) return;
    let vivo = true;
    setEstado("cargando");
    fetch(url + (mes ? "?mes=" + encodeURIComponent(mes) : ""), { cache: "no-store" })
      .then((r) => r.json())
      .then((j: Informe) => {
        // solo banners definidos en data.ts (descarta pruebas o ids viejos) y recalcula totales
        const conocidos = (data.pauta.banners || []).map((b) => b.id);
        const banners = (j.banners || []).filter((b) => conocidos.includes(b.banner));
        const imp = banners.reduce((s, b) => s + b.imp, 0);
        const clic = banners.reduce((s, b) => s + b.clic, 0);
        if (vivo) setEstado({ ...j, banners, totales: { impresiones: imp, clics: clic, ctr: imp ? Math.round((clic / imp) * 1000) / 10 : 0 } });
      })
      .catch(() => vivo && setEstado("local"));
    return () => {
      vivo = false;
    };
  }, [url, mes]);

  if (estado === "cargando") return <p className="muted">Cargando informe…</p>;
  if (estado === "local") return <StatsLocales />;
  const j = estado;
  const t = j.totales;
  return (
    <>
      <div className="calc-sum" style={{ marginBottom: 14 }}>
        <div className="calc-sum__item"><b>{t.impresiones || 0}</b><span>impresiones en {j.mes}</span></div>
        <div className="calc-sum__item"><b>{t.clics || 0}</b><span>clics</span></div>
        <div className="calc-sum__item"><b>{t.ctr || 0}%</b><span>CTR promedio</span></div>
        <div className="calc-sum__item"><b>{j.banners.length}</b><span>banners con datos</span></div>
      </div>
      {j.banners.length ? <Tabla filas={j.banners} /> : <p className="muted">Todavía no hay eventos registrados en {j.mes}. Visita la portada y recarga esta página.</p>}
      <p className="muted" style={{ padding: "10px 0 0" }}>
        Fuente: servidor de Licores Palmira (n8n). Actualizado {new Date(j.generado).toLocaleString("es-CO")}. Cambia el mes con <code>?mes=AAAA-MM</code>.
      </p>
    </>
  );
}

const NOTAS: [string, string, string, string][] = [
  ["#ef1c25", "image", "Nosotros optimizamos", "La marca envía su arte en cualquier tamaño; lo convertimos a WebP, lo recortamos al formato y lo dejamos por debajo del peso máximo. Así la portada sigue cargando en menos de 2 segundos."],
  ["#f2592a", "calendar-check", "Vigencia programada", "Cada banner tiene fecha de inicio y fin. Se publica y se retira solo, sin tocar la web."],
  ["#feb140", "bar-chart-3", "Informe de resultados", "Medimos impresiones (la tarjeta se vio al menos a la mitad) y clics de cada banner. La marca recibe un informe mensual con su alcance y su CTR."],
  ["#399933", "shield-check", "Publicidad responsable", "Etiqueta “Patrocinado” visible, puerta de verificación de edad y leyenda legal en toda la web (Ley 30 de 1986 y Ley 124 de 1994)."]
];

export default function Pauta() {
  usePageTitle("Espacios de pauta · Licores Palmira", { noindex: true });
  return (
    <main>
      <div className="page-head page-head--cat" style={{ "--cat-color": "#0b0b0b" } as CSSVars}>
        <div className="contenedor">
          <nav className="breadcrumb" aria-label="Ruta">
            <Link to="/">Inicio</Link>
            <Icon name="chevron-right" size={14} wrap />
            <span>Pauta</span>
          </nav>
          <div className="seccion-title">
            <div className="seccion-title__kicker">Uso comercial</div>
            <h1>Espacios de <em>pauta</em></h1>
          </div>
        </div>
      </div>

      <section className="seccion seccion--alt" id="espacios">
        <div className="contenedor">
          <Reveal className="seccion-head">
            <div className="seccion-title">
              <div className="seccion-title__kicker">Espacios y tarifas</div>
              <h2>Elige dónde quieres aparecer</h2>
              <p>Tarifas mensuales de referencia en pesos colombianos. Paquetes trimestrales con descuento y combinaciones a la medida.</p>
            </div>
          </Reveal>
          <Reveal className="espacios" stagger>
            {data.pauta.espacios.map((e) => <AdSlotCard key={e.id} e={e} />)}
          </Reveal>
          <Reveal className="espacios__pack">
            <div>
              <div className="seccion-title__kicker">Paquete recomendado</div>
              <h3>Marca del mes</h3>
              <p>Posición 1 del carrusel + banner ancho + categoría patrocinada + producto destacado + logo en el muro de marcas + mención en el mensaje de WhatsApp a clientes mayoristas.</p>
            </div>
            <div className="espacios__pack-precio">
              <span>Desde</span>
              <b>$900.000</b>
              <small>/ mes · ahorras $300.000</small>
              <a className="btn btn--amarillo" href={wa("pedido", "Hola Licores Palmira, mi marca quiere el paquete Marca del mes.")} target="_blank" rel="noopener">Reservar paquete</a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="seccion">
        <div className="contenedor">
          <Reveal className="seccion-head">
            <div className="seccion-title">
              <div className="seccion-title__kicker">Formatos</div>
              <h2>Especificaciones de las imágenes</h2>
              <p>Para que el banner cargue rápido y se vea perfecto en celular y escritorio. Si la marca no tiene diseñador, nosotros armamos la tarjeta con su foto de producto y sus colores.</p>
            </div>
          </Reveal>
          <Reveal className="tabla-wrap">
            <table className="tabla">
              <thead><tr><th>Espacio</th><th>Tamaño</th><th>Formato y peso</th><th>Recomendaciones</th></tr></thead>
              <tbody>
                <tr><td>Carrusel principal</td><td>1080 × 1350 px (4:5, el mismo formato de una publicación de Instagram)</td><td>JPG, PNG o WebP · la web lo optimiza a 864 × 1080 (≤ 150 KB)</td><td>Texto grande (mín. 48 px), producto centrado y 60 px de margen en los bordes. Sirve el mismo arte que publican en redes.</td></tr>
                <tr><td>Banner ancho</td><td>1600 × 600 px (8:3)</td><td>WebP o JPG · máx. 180 KB</td><td>Mensaje a la izquierda, producto a la derecha. En celular se muestra la mitad central.</td></tr>
                <tr><td>Categoría patrocinada</td><td>1000 × 750 px (4:3)</td><td>WebP o JPG · máx. 120 KB</td><td>Foto ambiental oscura; el nombre de la categoría se superpone abajo.</td></tr>
                <tr><td>Producto destacado</td><td>Foto del producto, fondo transparente</td><td>PNG o WebP · máx. 150 KB</td><td>Botella de frente, sin sombra fuerte. Si no la tienen, la generamos.</td></tr>
                <tr><td>Logo en muro de marcas</td><td>480 × 200 px</td><td>SVG o PNG transparente · máx. 40 KB</td><td>Logo a color sobre fondo blanco.</td></tr>
              </tbody>
            </table>
          </Reveal>
          <Reveal className="spec-notas" stagger>
            {NOTAS.map(([c, ico, h, p]) => (
              <div key={h} className="beneficio" style={{ "--b-color": c } as CSSVars}>
                <span className="beneficio__icon"><Icon name={ico} size={26} wrap /></span>
                <div><h3>{h}</h3><p>{p}</p></div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="seccion seccion--alt">
        <div className="contenedor" style={{ maxWidth: 900 }}>
          <Reveal className="seccion-head">
            <div className="seccion-title">
              <div className="seccion-title__kicker">Medición</div>
              <h2>Lo que verá la marca en su informe</h2>
              <p>Datos reales del mes en curso, consolidados en el servidor de Licores Palmira: cada vez que un visitante ve o toca un banner, queda contado. La marca recibe este resumen al cierre de cada mes.</p>
            </div>
          </Reveal>
          <Reveal className="tabla-wrap">
            <Informe />
          </Reveal>
        </div>
      </section>

      <section className="cta-band">
        <div className="contenedor cta-band__inner">
          <Reveal>
            <h2>¿Hablamos?</h2>
            <p>Cuéntanos qué marca eres y qué quieres lograr. Te enviamos la propuesta en el mismo día.</p>
          </Reveal>
          <Reveal style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <a className="btn btn--rojo btn--lg" href={wa("pedido", "Hola Licores Palmira, quiero una propuesta de pauta para mi marca.")} target="_blank" rel="noopener">
              <Icon name="whatsapp" size={18} wrap />WhatsApp comercial
            </a>
            <a className="btn btn--blanco btn--lg" href={"mailto:" + data.marca.email + "?subject=Pauta%20con%20mi%20marca"}>
              <Icon name="mail" size={18} wrap />Escribir correo
            </a>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
