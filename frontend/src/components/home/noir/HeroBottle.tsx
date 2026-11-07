/* ============================================================
   HeroBottle · portada guiada por scroll
   ------------------------------------------------------------
   La sección se fija (pin) mientras el usuario desplaza; GSAP
   ScrollTrigger convierte el scroll en una línea de tiempo que
   mueve la botella 3D y muestra cada capítulo. Subir el scroll
   rebobina la animación cuadro a cuadro.
   - Three.js se carga aparte (import dinámico) para no frenar
     el primer pintado de la portada.
   - Sin WebGL: se usa una foto de respaldo y el texto sigue
     funcionando igual.
   - Con "reducir movimiento": no hay pin, todo queda visible.
   ============================================================ */
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { data } from "@/data/data";
import { Icon } from "@/components/ui/Icon";
import { SmartLink } from "@/components/ui/SmartLink";
import { AMBIENTE, LICORES, initialBottleState, webglDisponible } from "./bottleConfig";
import type { BottleScene } from "./BottleScene";

gsap.registerPlugin(ScrollTrigger);

const CAPITULOS = [
  { id: "inicio", label: "Inicio" },
  { id: "historia", label: "1994" },
  { id: "variedad", label: "Variedad" },
  { id: "mayor", label: "Detal y mayor" },
  { id: "pedido", label: "Tu pedido" }
];
/* posición de cada capítulo en la línea de tiempo (0–10) */
const MARCAS = [0, 1.7, 4.0, 6.9, 9.0];
const DURACION = 10;

const cat = (id: string) => data.categorias.find((c) => c.id === id);
const DESTILADOS = [
  { id: "whisky", nombre: "Whisky", n: cat("whisky")?.cantidad },
  { id: "ron", nombre: "Ron", n: cat("ron")?.cantidad },
  { id: "aguardiente", nombre: "Aguardiente", n: cat("aguardiente")?.cantidad },
  { id: "tequila", nombre: "Tequila", n: cat("tequila")?.cantidad }
];

export function HeroBottle() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const S = useRef(initialBottleState());
  const scene = useRef<BottleScene | null>(null);
  const st = useRef<ScrollTrigger | null>(null);
  const limpiar = useRef<() => void>();
  const chromeRef = useRef(0);
  const [gl] = useState(() => typeof window !== "undefined" && webglDisponible());
  const [listo, setListo] = useState(false);
  const [activo, setActivo] = useState(0);
  const [capitulo, setCapitulo] = useState(0);
  const [estatico, setEstatico] = useState(false);

  /* 1) Escena 3D (carga diferida) */
  useEffect(() => {
    if (!gl || !canvas.current) return;
    let vivo = true;
    let io: IntersectionObserver | undefined;
    const movil = window.matchMedia("(max-width: 819px)").matches;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    import("./BottleScene").then(async ({ BottleScene }) => {
      if (!vivo || !canvas.current) return;
      const s = new BottleScene(canvas.current, S.current, { movil });
      await s.init();
      if (!vivo) return s.dispose();
      scene.current = s;
      s.setChrome(chromeRef.current);
      setListo(true);
      if (reducir) {
        s.renderUnaVez();
        return;
      }
      // solo dibuja mientras la portada está en pantalla y la pestaña visible
      let visible = true;
      const actualizar = () => s.setActivo(visible && !document.hidden);
      io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; actualizar(); }, { rootMargin: "100px" });
      io.observe(root.current!);
      document.addEventListener("visibilitychange", actualizar);
      actualizar();
      limpiar.current = () => document.removeEventListener("visibilitychange", actualizar);
    });
    return () => {
      vivo = false;
      io?.disconnect();
      limpiar.current?.();
      scene.current?.dispose();
      scene.current = null;
    };
  }, [gl]);

  /* 2) Línea de tiempo con el scroll */
  useEffect(() => {
    const el = root.current, stg = stage.current;
    if (!el || !stg) return;

    // alto del header fijo para que el texto no quede debajo
    const medirChrome = () => {
      const h = document.getElementById("header");
      const mb = document.querySelector<HTMLElement>(".megabar");
      let alto = h ? h.getBoundingClientRect().height : 0;
      if (mb && getComputedStyle(mb).position === "sticky") alto += mb.getBoundingClientRect().height;
      // con movimiento reducido el hero no queda debajo del header
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) alto = 0;
      stg.style.setProperty("--chrome-h", alto + "px");
      // barra de pestañas inferior en móvil
      const tab = document.querySelector<HTMLElement>(".tabbar");
      stg.style.setProperty("--hb-tab", (tab && getComputedStyle(tab).display !== "none" ? tab.getBoundingClientRect().height : 0) + "px");
      el.style.setProperty("--chrome-h", alto + "px");
      chromeRef.current = alto;
      scene.current?.setChrome(alto);
    };
    medirChrome();
    window.addEventListener("resize", medirChrome);

    const q = gsap.utils.selector(el);
    const mm = gsap.matchMedia();

    mm.add(
      { desk: "(min-width: 820px)", movil: "(max-width: 819px)", reducir: "(prefers-reduced-motion: reduce)" },
      (ctx) => {
        const { desk, reducir } = ctx.conditions as { desk: boolean; reducir: boolean };
        const s = S.current;
        Object.assign(s, initialBottleState());

        if (reducir) {
          setEstatico(true);
          Object.assign(s, { rotY: -0.2, x: 0, y: 0, scale: desk ? 1 : 0.8, dust: 0.4 });
          scene.current?.renderUnaVez();
          return () => setEstatico(false);
        }

        const X = desk ? 1.3 : 0;          // desplazamiento lateral de la botella
        const Ym = desk ? 0 : 1.0;         // en móvil la botella va arriba y el texto abajo
        const Sc = desk ? 1 : 0.64;
        Object.assign(s, { y: Ym, scale: Sc });

        const pintarAmbiente = () => {
          const k = Math.max(0, Math.min(3, s.liquid));
          const i0 = Math.floor(k), i1 = Math.min(3, i0 + 1), f = k - i0;
          const c = gsap.utils.interpolate(AMBIENTE[i0], AMBIENTE[i1], f) as string;
          stg.style.setProperty("--hb-glow", c);
          setActivo(Math.round(k));
        };

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => "+=" + window.innerHeight * (desk ? 4.6 : 3.8),
            pin: stg,
            scrub: 0.9,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              stg.style.setProperty("--hb-p", self.progress.toFixed(4));
              const t = self.progress * DURACION;
              let c = 0;
              MARCAS.forEach((m, i) => { if (t >= m - 0.35) c = i; });
              setCapitulo(c);
            }
          }
        });
        st.current = tl.scrollTrigger || null;

        tl.eventCallback("onUpdate", pintarAmbiente);
        pintarAmbiente();

        /* — Intro: la palabra "Palmira" detrás de la botella se abre y se apaga — */
        tl.to(q(".hb__wordmark"), { yPercent: -18, scale: 1.12, autoAlpha: 0, duration: 1.4, ease: "power1.in" }, 0)
          .to(q(".hb__intro"), { autoAlpha: 0, y: -30, duration: 0.6 }, 0.1)
          .to(q(".hb__hint"), { autoAlpha: 0, duration: 0.4 }, 0)
          .to(s, { rotY: Math.PI, x: X, duration: 1.6, ease: "power2.inOut" }, 0.3)

        /* — Capítulo 1 · historia — */
          .fromTo(q(".hb__ch--1"), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" }, 1.3)
          .to(q(".hb__ch--1"), { autoAlpha: 0, y: -40, duration: 0.5, ease: "power1.in" }, 3.0)

        /* — Capítulo 2 · variedad: el líquido cambia de destilado — */
          .to(s, { rotY: Math.PI * 2, x: -X, duration: 1.4, ease: "power2.inOut" }, 2.9)
          .fromTo(q(".hb__ch--2"), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" }, 3.6)
          .to(s, { liquid: 3, rotY: Math.PI * 2.5, duration: 1.9, ease: "none" }, 4.3)
          .to(q(".hb__ch--2"), { autoAlpha: 0, y: -40, duration: 0.5, ease: "power1.in" }, 6.0)

        /* — Capítulo 3 · detal y mayor — */
          .to(s, { liquid: 0, rotY: Math.PI * 3, x: X, tilt: desk ? 0.1 : 0.06, duration: 1.2, ease: "power2.inOut" }, 5.9)
          .fromTo(q(".hb__ch--3"), { autoAlpha: 0, y: 50 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power2.out" }, 6.6)
          .to(q(".hb__ch--3"), { autoAlpha: 0, y: -40, duration: 0.5, ease: "power1.in" }, 8.0)

        /* — Final · pedido — */
          .to(s, { rotY: Math.PI * 4 - 0.2, x: 0, tilt: 0, y: desk ? 0.75 : 1.25, scale: desk ? 0.68 : 0.5, dust: 1, duration: 1.3, ease: "power2.inOut" }, 7.9)
          .fromTo(q(".hb__final"), { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: "power2.out" }, 8.8)
          .to({}, { duration: 0.4 }, 9.6); // pausa al final antes de soltar el pin

        // los capítulos arrancan ocultos (GSAP los muestra)
        gsap.set(q(".hb__ch, .hb__final"), { autoAlpha: 0 });

        return () => { st.current = null; };
      }
    );

    // si el contenido de abajo cambia de alto (imágenes, carruseles), recalcula
    let tid = 0;
    const ro = new ResizeObserver(() => { window.clearTimeout(tid); tid = window.setTimeout(() => ScrollTrigger.refresh(), 250); });
    ro.observe(document.body);

    return () => {
      window.removeEventListener("resize", medirChrome);
      ro.disconnect();
      window.clearTimeout(tid);
      mm.revert();
    };
  }, []);

  /* salto a un capítulo desde la barra de progreso */
  const irA = (i: number) => {
    const t = st.current;
    if (!t) return;
    const y = t.start + ((MARCAS[i] + (i ? 0.45 : 0)) / DURACION) * (t.end - t.start);
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <section
      ref={root}
      className={"hb" + (estatico ? " hb--estatico" : "") + (gl ? "" : " hb--sin-gl")}
      aria-labelledby="hb-title"
    >
      <div className="hb__stage" ref={stage}>
        <div className="hb__fondo" aria-hidden="true"></div>

        <h1 className="hb__wordmark" id="hb-title">
          <span className="hb__wordmark-pre">Licores</span>
          <span className="hb__wordmark-main">Palmira</span>
        </h1>

        {gl ? (
          <canvas ref={canvas} className={"hb__canvas" + (listo ? " is-ready" : "")} aria-hidden="true" />
        ) : (
          <img className="hb__respaldo" src="/assets/img/hero-bar.webp" alt="" decoding="async" />
        )}

        <div className="hb__ui">
          <div className="hb__intro">
            <p>Licorera familiar en Palmira desde 1994. Más de 2.000 referencias con domicilio el mismo día.</p>
          </div>

          <article className="hb__ch hb__ch--1 hb__ch--izq" aria-label="Nuestra historia">
            <p className="hb__eyebrow">Desde 1994</p>
            <h2>Más de treinta años en los brindis de Palmira.</h2>
            <p>Somos una empresa familiar con bodega de cuatro pisos en el centro de la ciudad y una flota propia de 15 vehículos.</p>
          </article>

          <article className="hb__ch hb__ch--2 hb__ch--der" aria-label="Variedad">
            <p className="hb__eyebrow">Más de 2.000 referencias</p>
            <h2>Una botella para cada ocasión.</h2>
            <ul className="hb__destilados">
              {DESTILADOS.map((d, i) => (
                <li key={d.id} className={i === activo ? "is-on" : undefined} style={{ ["--c" as string]: LICORES[i].light }}>
                  <SmartLink href={"/catalogo?categoria=" + d.id}>
                    <i aria-hidden="true"></i>
                    <span>{d.nombre}</span>
                    {d.n ? <small>{d.n} referencias</small> : null}
                  </SmartLink>
                </li>
              ))}
            </ul>
          </article>

          <article className="hb__ch hb__ch--3 hb__ch--izq" aria-label="Detal y mayor">
            <p className="hb__eyebrow">Para tu casa o tu negocio</p>
            <h2>Al detal y al por mayor.</h2>
            <p>
              Desde {data.marca.minimoMayor} unidades de una misma referencia el carrito aplica el precio mayorista solo. Si tienes tienda, bar o
              eventos, te asignamos un asesor.
            </p>
            <SmartLink className="hb__link" href="/mayoristas">
              Conocer el programa mayorista <Icon name="arrow-right" size={16} />
            </SmartLink>
          </article>

          <div className="hb__final">
            <h2>Te lo llevamos hoy.</h2>
            <p>Pide por WhatsApp o arma tu pedido en el catálogo. Domicilio en Palmira con vehículos propios.</p>
            <div className="hb__ctas">
              <SmartLink className="hb__btn hb__btn--oro" href="/catalogo">
                Ver catálogo
              </SmartLink>
              <SmartLink className="hb__btn hb__btn--wa" href="wa:pedido">
                <Icon name="whatsapp" size={18} />
                Pedir por WhatsApp
              </SmartLink>
            </div>
          </div>

          <div className="hb__hint" aria-hidden="true">
            <span>Desliza</span>
            <i></i>
          </div>
        </div>

        <nav className="hb__rail" aria-label="Capítulos de la portada">
          <span className="hb__rail-linea" aria-hidden="true"><b></b></span>
          {CAPITULOS.map((c, i) => (
            <button key={c.id} type="button" className={i === capitulo ? "is-on" : undefined} onClick={() => irA(i)} aria-current={i === capitulo ? "step" : undefined}>
              <span>{c.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </section>
  );
}
