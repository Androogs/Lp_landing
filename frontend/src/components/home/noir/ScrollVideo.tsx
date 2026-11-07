/* ============================================================
   ScrollVideo · vídeo sincronizado con el scroll (video scrub)
   ------------------------------------------------------------
   Opcional: no se usa en la portada por defecto. Sirve si más
   adelante se graba o renderiza un vídeo real de la botella
   (por ejemplo, un giro de 360°). Al bajar el scroll el vídeo
   avanza y al subir retrocede.

   Uso:
     <ScrollVideo src="/assets/video/botella.mp4" poster="/assets/video/botella.webp" alto={300} />

   Para que el scrub sea fluido el vídeo debe tener TODOS los
   cuadros como clave (sin esto el navegador salta):
     ffmpeg -i entrada.mov -an -c:v libx264 -preset slow -crf 22 \
       -g 1 -pix_fmt yuv420p -movflags +faststart botella.mp4
   Con la CSP actual el vídeo debe servirse desde el mismo dominio
   (agregar media-src 'self' en infra/nginx/security-headers.conf).
   ============================================================ */
import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface Props {
  src: string;
  poster?: string;
  /** largo del recorrido en % del alto de pantalla (300 = tres pantallas) */
  alto?: number;
  children?: ReactNode;
  className?: string;
}

export function ScrollVideo({ src, poster, alto = 300, children, className }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = root.current, v = video.current;
    if (!el || !v) return;
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducir) return;
    let objetivo = 0, raf = 0;
    const paso = () => {
      if (v.readyState >= 2 && Math.abs(v.currentTime - objetivo) > 0.01) {
        v.currentTime += (objetivo - v.currentTime) * 0.35;
      }
      raf = requestAnimationFrame(paso);
    };
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top top",
      end: "+=" + alto + "%",
      pin: el.querySelector(".svideo__stage") as HTMLElement,
      onUpdate: (self) => { if (v.duration) objetivo = self.progress * v.duration; }
    });
    v.pause();
    raf = requestAnimationFrame(paso);
    return () => { cancelAnimationFrame(raf); st.kill(); };
  }, [alto]);

  return (
    <div ref={root} className={"svideo" + (className ? " " + className : "")}>
      <div className="svideo__stage">
        <video ref={video} src={src} poster={poster} muted playsInline preload="auto" aria-hidden="true" />
        {children && <div className="svideo__ui">{children}</div>}
      </div>
    </div>
  );
}
