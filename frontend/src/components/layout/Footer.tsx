import { Link } from "react-router-dom";
import { data } from "@/data/data";
import { wa } from "@/lib/whatsapp";
import { Icon } from "@/components/ui/Icon";

export function Footer() {
  const m = data.marca;
  const year = new Date().getFullYear();
  const cats = data.categorias.slice(0, 8);
  const tel = m.telefonoIntl.replace(/\s/g, "");
  return (
    <footer className="footer" id="contacto">
      <div className="contenedor">
        <div className="footer__grid">
          <div className="footer__brand">
            <img src="/assets/marca/logo-blanco.webp" alt="Licores Palmira" width={82} height={64} />
            <p>
              {m.eslogan}. Desde {m.fundacion} en Palmira, Valle del Cauca: licores nacionales e importados, vinos, cervezas y todo para tu fiesta.
            </p>
            <div className="footer__social">
              <a href={m.instagram} target="_blank" rel="noopener" aria-label="Instagram"><Icon name="instagram" size={18} /></a>
              <a href={m.facebook} target="_blank" rel="noopener" aria-label="Facebook"><Icon name="facebook" size={18} /></a>
              <a href={m.tiktok} target="_blank" rel="noopener" aria-label="TikTok"><Icon name="tiktok" size={18} /></a>
              <a href={wa("pedido")} target="_blank" rel="noopener" aria-label="WhatsApp"><Icon name="whatsapp" size={18} /></a>
            </div>
          </div>
          <div className="footer__col">
            <h4>Navegación</h4>
            <ul>
              <li><Link to="/">Inicio</Link></li>
              <li><Link to="/catalogo">Catálogo</Link></li>
              <li><Link to="/#categorias">Categorías</Link></li>
              <li><Link to="/#mas-buscado">Lo más buscado</Link></li>
              <li><Link to="/calculadora">Calculadora de eventos</Link></li>
              <li><Link to="/#sedes">Sedes</Link></li>
            </ul>
          </div>
          <div className="footer__col">
            <h4>Categorías</h4>
            <ul>
              {cats.map((c) => (
                <li key={c.id}><Link to={"/catalogo?categoria=" + c.id}>{c.nombre}</Link></li>
              ))}
            </ul>
          </div>
          <div className="footer__col">
            <h4>Atención al cliente</h4>
            <ul>
              <li><Link to="/seguimiento">Seguir mi pedido</Link></li>
              <li><Link to="/ayuda#faq">Domicilios y entregas</Link></li>
              <li><Link to="/ayuda#faq">Medios de pago</Link></li>
              <li><Link to="/mayoristas">Ventas al por mayor</Link></li>
              <li><Link to="/ayuda#faq">Preguntas frecuentes</Link></li>
              <li><Link to="/ayuda#legal">Políticas y términos</Link></li>
            </ul>
          </div>
          <div className="footer__col footer__col--contacto">
            <h4>Contacto</h4>
            <ul className="footer__contact">
              <li><Icon name="map-pin" size={17} /><span>{m.direccion}, {m.barrio}<br />{m.ciudad}</span></li>
              <li><Icon name="phone" size={17} /><a href={"tel:" + tel}>{m.telefono}</a></li>
              <li><Icon name="whatsapp" size={17} /><a href={wa("pedido")} target="_blank" rel="noopener">WhatsApp {m.telefono}</a></li>
              <li><Icon name="mail" size={17} /><a href={"mailto:" + m.email}>{m.email}</a></li>
              <li><Icon name="clock" size={17} /><span>{data.sedes[0].horario}</span></li>
            </ul>
          </div>
        </div>
        <div className="footer__pagos">
          <span>Medios de pago</span>
          <span className="pago"><Icon name="banknote" size={15} />Efectivo</span>
          <span className="pago"><Icon name="qr-code" size={15} />QR</span>
          <span className="pago"><Icon name="smartphone" size={15} />Transferencia</span>
          <span className="pago"><Icon name="credit-card" size={15} />Débito / Crédito</span>
          <span className="pago"><Icon name="truck" size={15} />Pago contra entrega</span>
        </div>
        <div className="footer__legal">
          <div className="footer__legal-inner">
            <p id="legal">
              <b>El exceso de alcohol es perjudicial para la salud. Ley 30 de 1986.</b> Prohíbase el expendio de bebidas embriagantes a menores de edad y
              mujeres embarazadas. Ley 124 de 1994. Venta exclusiva para mayores de 18 años.
            </p>
            <div className="footer__legal-row">
              <span>
                © {year} {m.razon} · {m.ciudad}. Todos los derechos reservados.
              </span>
              <span>
                Precios en pesos colombianos (COP). Sujetos a cambio sin previo aviso. · <Link to="/creditos">Créditos fotográficos</Link> · Diseño y
                desarrollo:{" "}
                <a href="https://astronomical.dzapyd.easypanel.host" target="_blank" rel="noopener">
                  Astronomical AI
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
