import { data } from "@/data/data";
import { usePageTitle } from "@/hooks/usePageTitle";
import { AdCarousel } from "@/components/home/AdCarousel";
import { BenefitCard, BrandCarousel, CategoryCarousel, Cifras, ReviewsGrid, Sedes } from "@/components/home/Cards";
import { Countdown } from "@/components/home/Countdown";
import { SectionHead } from "@/components/home/SectionHead";
import { SelectionBanner } from "@/components/home/SelectionBanner";
import { HeroBottle } from "@/components/home/noir/HeroBottle";
import { Momentos } from "@/components/home/noir/Momentos";
import { SpiritsMarquee } from "@/components/home/noir/SpiritsMarquee";
import { useHomeTheme } from "@/hooks/useHomeTheme";
import "@/styles/home-noir.css";
import { ProductCarousel } from "@/components/product/ProductCarousel";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { SmartLink } from "@/components/ui/SmartLink";

const P = data.productos;
const GOOGLE = data.marca.googleResenas;

export default function Home() {
  usePageTitle();
  useHomeTheme();

  return (
    <main id="inicio" className="home-noir">
      {/* PORTADA 3D GUIADA POR SCROLL (botella Licores Palmira) */}
      <HeroBottle />

      {/* FRANJA DE DESTILADOS (se desliza con el scroll) */}
      <SpiritsMarquee />

      {/* CARRUSEL DE CARTELES (arte del cliente, ver src/data/data.ts → pauta.banners) */}
      <AdCarousel />

      {/* CATEGORÍAS */}
      <section className="seccion seccion--tight" id="categorias" aria-labelledby="t-categorias">
        <div className="contenedor">
          <SectionHead id="t-categorias" kicker="Comprar por categoría" em="Encuentra tu botella" span="en segundos" sub="Más de 2.000 referencias en bodega, listas para tu pedido." link={{ href: "/catalogo", texto: "Ver catálogo" }} />
          <CategoryCarousel items={data.categorias.filter((c) => !c.ocultoEnInicio)} />
        </div>
      </section>

      {/* OFERTAS DE LA SEMANA */}
      <section className="seccion seccion--marca" id="ofertas" aria-labelledby="t-ofertas">
        <div className="contenedor">
          <SectionHead
            id="t-ofertas"
            kicker="Zona de promociones"
            em="Ofertas"
            span="de la semana"
            sub="Precios especiales y novedades. Se renuevan cada lunes."
            aside={
              <div className="seccion-head__aside">
                <span className="countdown">
                  <Icon name="timer" size={16} wrap />
                  Termina en <Countdown />
                </span>
                <SmartLink className="seccion-head__link" href="/catalogo?filtro=ofertas">
                  Ver todas <Icon name="arrow-right" size={18} wrap />
                </SmartLink>
              </div>
            }
          />
          <ProductCarousel id="car-ofertas" items={P.filter((p) => p.antes).concat(P.filter((p) => p.badge === "Nuevo")).slice(0, 10)} />
        </div>
      </section>

      {/* LO MÁS BUSCADO */}
      <section className="seccion seccion--alt" id="mas-buscado" aria-labelledby="t-buscado">
        <div className="contenedor">
          <SectionHead id="t-buscado" kicker="¿Qué pide la gente?" em="Los favoritos" span="de Palmira" sub="Lo que más sale de nuestra bodega cada semana." link={{ href: "/catalogo", texto: "Ver más" }} />
          <ProductCarousel id="car-mas-buscado" items={P.filter((p) => p.masBuscado)} />
        </div>
      </section>

      {/* SELECCIÓN · marca exclusiva (posición 1) */}
      <SelectionBanner slot={1} />

      {/* MOMENTOS (reemplaza las tarjetas de promo de colores: fotos oscuras de la casa) */}
      <section className="seccion" id="experiencias" aria-labelledby="t-exp">
        <div className="contenedor">
          <SectionHead id="t-exp" kicker="Vive tus momentos" em="Todo lo que necesitas," span="en un solo pedido" sub="Para tu fiesta, tu negocio o tu evento." />
          <Momentos />
        </div>
      </section>

      {/* DESTACADOS */}
      <section className="seccion seccion--alt" id="destacados" aria-labelledby="t-dest">
        <div className="contenedor">
          <SectionHead id="t-dest" kicker="Selección de la casa" em="Los premium" span="para regalar" sub="Para celebrar en grande o simplemente darse un gusto." link={{ href: "/catalogo?filtro=regalo", texto: "Ver todos" }} />
          <ProductCarousel id="car-destacados" items={P.filter((p) => p.destacado)} />
        </div>
      </section>

      {/* WHISKY */}
      <section className="seccion" id="whisky" aria-labelledby="t-whisky">
        <div className="contenedor">
          <SectionHead id="t-whisky" kicker="Escocés · Irlandés · Bourbon" em="Elige" span="tu whisky" sub="Del clásico de todos los días al single malt para coleccionar." link={{ href: "/catalogo?categoria=whisky", texto: "Ver los 120" }} />
          <ProductCarousel id="car-whisky" items={P.filter((p) => p.categoria === "whisky").slice(0, 12)} />
        </div>
      </section>

      {/* RON Y AGUARDIENTE */}
      <section className="seccion seccion--alt" id="ron" aria-labelledby="t-ron">
        <div className="contenedor">
          <SectionHead id="t-ron" kicker="Tradición colombiana" em="Ron y" span="aguardiente" sub="Viejo de Caldas, Medellín, Antioqueño, Blanco del Valle y más." link={{ href: "/catalogo?categoria=aguardiente", texto: "Ver aguardientes" }} />
          <ProductCarousel id="car-ron" items={P.filter((p) => p.categoria === "ron" || p.categoria === "aguardiente").slice(0, 14)} />
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="seccion" id="beneficios" aria-labelledby="t-ben">
        <div className="contenedor">
          <SectionHead id="t-ben" kicker="Por qué comprar aquí" em="Comprar aquí" span="es fácil" center />
          <Reveal className="beneficios" stagger>
            {data.beneficios.map((b) => (
              <BenefitCard key={b.titulo} b={b} />
            ))}
          </Reveal>
        </div>
      </section>

      {/* SELECCIÓN · posición 2 (Top 5 Colombia) */}
      <SelectionBanner slot={2} />

      {/* CERVEZAS, MEZCLADORES Y SNACKS */}
      <section className="seccion seccion--alt" id="fiesta" aria-labelledby="t-fiesta">
        <div className="contenedor">
          <SectionHead id="t-fiesta" kicker="Cervezas · Mezcladores · Hielo · Snacks" em="Que no falte" span="nada" sub="Cerveza bien fría, gaseosas, energizantes y pasabocas para completar el pedido." link={{ href: "/catalogo?categoria=cervezas", texto: "Ver cervezas" }} />
          <ProductCarousel id="car-fiesta" items={P.filter((p) => ["cervezas", "cocteleria", "bebidas", "snacks"].includes(p.categoria)).slice(0, 14)} />
        </div>
      </section>

      {/* MARCAS */}
      <section className="seccion" id="marcas" aria-labelledby="t-marcas">
        <div className="contenedor">
          <SectionHead id="t-marcas" kicker="Nuestras marcas" em="Marcas" span="de confianza" center />
        </div>
        <BrandCarousel />
      </section>

      {/* CIFRAS (con íconos) */}
      <section className="nosotros-strip seccion" id="cifras" aria-labelledby="t-cifras">
        <div className="nosotros-strip__bg">
          <img src="/assets/img/bodega.webp" alt="" loading="lazy" decoding="async" />
        </div>
        <div className="contenedor nosotros-strip__inner">
          <Reveal>
            <div className="seccion-title seccion-title--light">
              <div className="titulo__kicker">Desde 1994</div>
              <h2 className="titulo__h" id="t-cifras"><em>La licorera más grande</em><span>de Palmira</span></h2>
            </div>
            <p>Empresa familiar con bodega de cuatro pisos, flota propia y más de 2.000 referencias al detal y al por mayor.</p>
          </Reveal>
          <Cifras />
        </div>
      </section>

      {/* SEDE */}
      <section className="seccion" id="sedes" aria-labelledby="t-sedes">
        <div className="contenedor">
          <SectionHead id="t-sedes" kicker="Visítanos" em="Nuestra sede" span="en Palmira" sub="Recoge en tienda o pide a domicilio: te lo llevamos con flota propia." />
          <Sedes />
        </div>
      </section>

      {/* RESEÑAS DE GOOGLE */}
      <section className="seccion seccion--alt" id="resenas" aria-labelledby="t-resenas">
        <div className="contenedor">
          <SectionHead
            id="t-resenas"
            kicker="Reseñas de Google"
            em="Lo que dicen"
            span="nuestros clientes"
            aside={
              <div className="seccion-head__aside">
                <a className="google-pill" href={GOOGLE} target="_blank" rel="noopener">
                  <b>4,4</b><i>★★★★★</i><span>366 reseñas en Google</span>
                </a>
                <a className="seccion-head__link" href={GOOGLE} target="_blank" rel="noopener">
                  Déjanos tu reseña <Icon name="arrow-up-right" size={18} wrap />
                </a>
              </div>
            }
          />
          <ReviewsGrid />
        </div>
      </section>
    </main>
  );
}
