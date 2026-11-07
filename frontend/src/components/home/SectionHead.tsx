import type { ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { SmartLink } from "@/components/ui/SmartLink";

interface SectionHeadProps {
  id: string;
  kicker: string;
  em: string;
  span: string;
  sub?: string;
  link?: { href: string; texto: string; icon?: string };
  aside?: ReactNode;
  center?: boolean;
  light?: boolean;
}

/** Encabezado de sección de la portada (kicker + título en dos líneas + subtítulo + enlace) */
export function SectionHead({ id, kicker, em, span, sub, link, aside, center, light }: SectionHeadProps) {
  return (
    <Reveal className={"seccion-head" + (center ? " seccion-head--center" : "")}>
      <div className={"seccion-title" + (center ? " seccion-title--center" : "") + (light ? " seccion-title--light" : "")}>
        <div className="titulo__kicker">{kicker}</div>
        <h2 className="titulo__h" id={id}>
          <em>{em}</em>
          <span>{span}</span>
        </h2>
      </div>
      {sub && <p className="seccion-head__sub">{sub}</p>}
      {aside}
      {link && (
        <SmartLink className="seccion-head__link" href={link.href}>
          {link.texto} <Icon name={link.icon || "arrow-right"} size={18} wrap />
        </SmartLink>
      )}
    </Reveal>
  );
}
