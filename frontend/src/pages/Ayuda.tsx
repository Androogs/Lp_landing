import { data } from "@/data/data";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Icon } from "@/components/ui/Icon";
import { Reveal } from "@/components/ui/Reveal";
import { FormHabeasData, PoliticaDatos } from "@/components/legal/HabeasData";

export default function Ayuda() {
  usePageTitle("Ayuda y preguntas frecuentes · Licores Palmira");
  return (
    <main>
      <section className="seccion" id="faq" aria-labelledby="t-faq">
        <div className="contenedor">
          <Reveal className="seccion-head">
            <div className="seccion-title seccion-title--center">
              <div className="seccion-title__kicker">Preguntas frecuentes</div>
              <h2 id="t-faq">Resolvemos tus <em>dudas</em></h2>
            </div>
          </Reveal>
          <Reveal className="faq">
            {data.faqs.map((f) => (
              <details key={f.q}>
                <summary>
                  {f.q}
                  <Icon name="plus" size={20} />
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="seccion" id="legal" aria-labelledby="t-legal">
        <div className="contenedor" style={{ maxWidth: 820 }}>
          <Reveal className="seccion-title">
            <div className="seccion-title__kicker">Políticas</div>
            <h2 id="t-legal">Términos, privacidad y <em>venta responsable</em></h2>
          </Reveal>
          <Reveal style={{ marginTop: 16, color: "var(--texto-suave)", fontSize: 15, display: "grid", gap: 12 }}>
            <p><b>Venta responsable.</b> Vendemos exclusivamente a mayores de 18 años. El exceso de alcohol es perjudicial para la salud (Ley 30 de 1986). Prohíbase el expendio de bebidas embriagantes a menores de edad y mujeres embarazadas (Ley 124 de 1994).</p>
            <p><b>Precios y disponibilidad.</b> Los precios se expresan en pesos colombianos (COP) e incluyen impuestos. Pueden cambiar sin previo aviso; el precio definitivo se confirma al momento del pedido. El precio al por mayor aplica desde 10 unidades de una misma referencia.</p>
            <p><b>Pedidos y pagos.</b> Los pedidos se confirman por WhatsApp. Aceptamos efectivo, transferencia, QR y tarjetas; los pagos por transferencia se verifican antes del despacho.</p>
            <p><b>Datos personales.</b> La información que nos compartes (nombre, teléfono, dirección) se usa únicamente para gestionar tu pedido y enviarte novedades si lo autorizas, conforme a la Ley 1581 de 2012. Puedes solicitar su actualización o eliminación escribiéndonos a {data.marca.email}.</p>
          </Reveal>
        </div>
      </section>

      <section className="seccion seccion--alt" id="datos" aria-labelledby="t-datos">
        <div className="contenedor" style={{ maxWidth: 820 }}>
          <Reveal className="seccion-title">
            <div className="seccion-title__kicker">Ley 1581 de 2012</div>
            <h2 id="t-datos">Política de tratamiento de <em>datos personales</em></h2>
          </Reveal>
          <PoliticaDatos />
          <FormHabeasData />
        </div>
      </section>
    </main>
  );
}
