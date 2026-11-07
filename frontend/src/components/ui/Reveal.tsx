import { createElement, type FormHTMLAttributes, type ReactNode } from "react";
import { useInViewOnce } from "@/hooks/useInView";

type Tag = "div" | "section" | "form" | "article" | "ul";

interface RevealProps extends FormHTMLAttributes<HTMLElement> {
  as?: Tag;
  /** Aplica la animación escalonada a los hijos (.reveal--stagger) */
  stagger?: boolean;
  children?: ReactNode;
  [key: `data-${string}`]: unknown;
}

/** Aparición al hacer scroll: añade .reveal y, al entrar en pantalla, .is-visible (mismos estilos de la versión estática) */
export function Reveal({ as = "div", stagger, className, children, ...rest }: RevealProps) {
  const [ref, visible] = useInViewOnce<HTMLElement>();
  const cls = [className, "reveal", stagger && "reveal--stagger", visible && "is-visible"].filter(Boolean).join(" ");
  return createElement(as, { ref, className: cls, ...rest }, children);
}
