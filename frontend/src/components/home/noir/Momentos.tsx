/* "Momentos": tres formas de comprar, con fotos oscuras de la casa.
   Las fotos se acercan al entrar en pantalla con CSS scroll-driven animations
   (animation-timeline: view()); en navegadores sin soporte quedan quietas. */
import { data } from "@/data/data";
import { Icon } from "@/components/ui/Icon";
import { SmartLink } from "@/components/ui/SmartLink";

const MOMENTOS = [
  {
    id: "fiesta",
    img: "/assets/img/banner-shots.webp",
    imgMd: "/assets/img/banner-shots-md.webp",
    titulo: "Para la fiesta",
    texto: "Licor, cerveza, mezcladores, hielo y vasos en un solo pedido. La calculadora te dice cuánto necesitas según invitados y horas.",
    cta: "Calcular mi pedido",
    href: "/calculadora",
    icono: "calculator"
  },
  {
    id: "negocio",
    img: "/assets/img/bodega.webp",
    imgMd: "/assets/img/bodega-md.webp",
    titulo: "Para tu negocio",
    texto: `Precio mayorista desde ${data.marca.minimoMayor} unidades, asesor asignado y entrega con flota propia de 15 vehículos.`,
    cta: "Ver programa mayorista",
    href: "/mayoristas",
    icono: "boxes"
  },
  {
    id: "hoy",
    img: "/assets/img/whisky-splash.webp",
    titulo: "Para hoy mismo",
    texto: "Escríbenos, confirmamos tu pedido y un vehículo nuestro te lo lleva. Puedes pagar al recibir.",
    cta: "Pedir por WhatsApp",
    href: "wa:pedido",
    icono: "whatsapp"
  }
];

export function Momentos() {
  return (
    <div className="mo">
      {MOMENTOS.map((m) => (
        <SmartLink key={m.id} className={"mo__card mo__card--" + m.id} href={m.href}>
          <span className="mo__media">
            <img
              src={m.img}
              srcSet={m.imgMd ? `${m.imgMd} 1000w, ${m.img} 1920w` : undefined}
              sizes={m.imgMd ? "(max-width: 820px) 100vw, 60vw" : undefined}
              alt=""
              loading="lazy"
              decoding="async"
            />
          </span>
          <span className="mo__body">
            <h3>{m.titulo}</h3>
            <p>{m.texto}</p>
            <span className="mo__cta">
              <Icon name={m.icono} size={17} />
              {m.cta}
            </span>
          </span>
        </SmartLink>
      ))}
    </div>
  );
}
