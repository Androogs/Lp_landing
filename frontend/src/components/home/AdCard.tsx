/* Pauta: tarjetas del carrusel principal, del menú desplegable y carteles compuestos */
import type { MouseEvent } from "react";
import { data } from "@/data/data";
import { useAdImpression } from "@/hooks/useAdImpression";
import { producto, prods } from "@/lib/catalogo";
import type { CSSVars } from "@/lib/colores";
import { track } from "@/lib/tracking";
import type { Banner } from "@/types";
import { Icon } from "@/components/ui/Icon";
import { ProductMedia } from "@/components/ui/ProductMedia";
import { SmartLink } from "@/components/ui/SmartLink";

interface AdProps { b: Banner; pos: number; extraClass?: string }

function useAd(b: Banner, pos: number) {
  const ref = useAdImpression<HTMLAnchorElement>(b.id, pos);
  const onClick = (_e: MouseEvent) => track("clic", b.id, { pos: String(pos) });
  return { ref, onClick };
}

/** Cartel tipo poster: titular grande, etiqueta, precio y botella real */
export function Poster({ b, pos, extraClass }: AdProps) {
  const { ref, onClick } = useAd(b, pos);
  const ps = prods(b.productos);
  const style: CSSVars = { "--c1": b.c1 || "#141414", "--c2": b.c2 || "#333", "--ac": b.acento || "#feb140" };
  return (
    <SmartLink
      ref={ref}
      className={"ad ad--poster" + (ps.length > 1 ? " ad--poster-2" : "") + (extraClass ? " " + extraClass : "")}
      href={b.href || "#"}
      style={style}
      data-ad={b.id}
      data-pos={pos}
      onClick={onClick}
    >
      <span className="ad__deco"></span>
      <span className="ad__head">
        <span className="ad__brand">{b.marca}</span>
        {!b.propio && <span className="ad__tag">Patrocinado</span>}
      </span>
      <span className="poster__text">
        {b.etiqueta && <span className="poster__badge">{b.etiqueta}</span>}
        <span className="poster__title">
          {(b.lineas || []).map((l, i) => (
            <span key={i}>{l}</span>
          ))}
          {b.destaque && <span className="poster__hi">{b.destaque}</span>}
        </span>
        {b.precio && <span className="poster__price">{b.precio}</span>}
        {b.nota && <span className="poster__note">{b.nota}</span>}
        {b.cta && (
          <span className="btn btn--amarillo btn--sm ad__cta">
            {b.cta}
            <Icon name="arrow-right" size={16} />
          </span>
        )}
      </span>
      <span className="poster__products">
        {ps.map((p) => (
          <span key={p.id}>
            <ProductMedia p={p} />
          </span>
        ))}
      </span>
      <span className="poster__foot">
        <img src="/assets/marca/logo-blanco.webp" alt="Licores Palmira" />
        <span>{data.marca.telefono}</span>
      </span>
    </SmartLink>
  );
}

/** Tarjeta de pauta: arte final (imagen), foto de fondo o tarjeta compuesta por color + producto */
export function AdCard({ b, pos, extraClass }: AdProps) {
  const { ref, onClick } = useAd(b, pos);
  if (b.tipo === "poster") return <Poster b={b} pos={pos} extraClass={extraClass} />;
  const head = (
    <>
      <span className="ad__brand">{b.marca || ""}</span>
      {b.tipo === "patrocinado" && <span className="ad__tag">Patrocinado</span>}
    </>
  );
  const extra = extraClass ? " " + extraClass : "";

  if (b.imagen) {
    return (
      <SmartLink
        ref={ref}
        className={"ad" + extra + " ad--imagen"}
        href={b.href || "#"}
        data-ad={b.id}
        data-pos={pos}
        aria-label={b.marca + ": " + (b.titulo || "")}
        onClick={onClick}
      >
        <img
          src={b.imagen}
          srcSet={b.imagenMd ? `${b.imagenMd} 540w, ${b.imagen} 864w` : undefined}
          sizes={b.imagenMd ? "(max-width: 640px) 86vw, (max-width: 960px) 46vw, 400px" : undefined}
          alt={b.titulo || b.marca}
          width={864}
          height={1080}
          loading={pos > 3 ? "lazy" : undefined}
          {...(pos > 3 ? {} : { fetchpriority: "high" })}
          decoding="async"
        />
        <span className="ad__head">{head}</span>
      </SmartLink>
    );
  }

  const p = producto(b.producto);
  const style: CSSVars | undefined = b.fondo ? undefined : { "--c1": b.color || "#141414", "--c2": b.color2 || "#3a3a3a" };
  return (
    <SmartLink
      ref={ref}
      className={"ad" + extra + " " + (b.fondo ? "ad--foto" : "ad--color")}
      href={b.href || "#"}
      style={style}
      data-ad={b.id}
      data-pos={pos}
      onClick={onClick}
    >
      {b.fondo ? (
        <img className="ad__bg" src={b.fondo} alt="" loading={pos > 3 ? "lazy" : undefined} decoding="async" />
      ) : (
        <span className="ad__deco"></span>
      )}
      <span className="ad__head">{head}</span>
      <span className="ad__body">
        {b.kicker && <span className="ad__kicker">{b.kicker}</span>}
        <span className="ad__title">{b.titulo}</span>
        {b.texto && <span className="ad__text">{b.texto}</span>}
        {b.cta && (
          <span className="btn btn--amarillo btn--sm ad__cta">
            {b.cta}
            <Icon name="arrow-right" size={16} />
          </span>
        )}
      </span>
      {p && (
        <span className="ad__product">
          <ProductMedia p={p} />
        </span>
      )}
    </SmartLink>
  );
}
