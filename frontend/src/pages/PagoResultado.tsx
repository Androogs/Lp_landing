/* Retorno desde Wompi (/pago/resultado?id=<transacción>).
   El estado se consulta al servidor, que a su vez lo confirma con Wompi: los parámetros de la URL no se toman como prueba de pago. */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { usePageTitle } from "@/hooks/usePageTitle";
import { api, mensajeError } from "@/lib/api";
import { precio } from "@/lib/format";
import { Icon } from "@/components/ui/Icon";

interface Resultado { reference?: string; estado: string; etiqueta: string; total?: number }

export default function PagoResultado() {
  usePageTitle("Resultado del pago · Licores Palmira", { noindex: true });
  const [params] = useSearchParams();
  const id = params.get("id") || "";
  const { clear } = useCart();
  const [r, setR] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!/^[\w-]{5,80}$/.test(id)) {
      setError("No recibimos un identificador de pago válido.");
      return;
    }
    let vivo = true;
    let intentos = 0;
    const consultar = async () => {
      try {
        const res = await api.get<Resultado>("/payments/wompi/result?id=" + encodeURIComponent(id));
        if (!vivo) return;
        setR(res);
        if (res.estado === "PAGADO") clear({ silencioso: true });
        // pagos en verificación (p. ej. PSE): se vuelve a consultar unas veces
        if ((res.estado === "PENDIENTE_PAGO" || res.estado === "PROCESANDO") && ++intentos < 6) setTimeout(consultar, 5000);
      } catch (e) {
        if (vivo) setError(mensajeError(e));
      }
    };
    void consultar();
    return () => {
      vivo = false;
    };
  }, [id, clear]);

  const ok = r?.estado === "PAGADO";
  const pendiente = !r || r.estado === "PENDIENTE_PAGO" || r.estado === "PROCESANDO";
  return (
    <main className="contenedor checkout">
      <div className="checkout__ok">
        <Icon name={error ? "circle-alert" : ok ? "circle-check" : pendiente ? "clock" : "circle-alert"} size={48} />
        <h1>{error ? "No pudimos verificar el pago" : ok ? "¡Pago aprobado!" : pendiente ? "Estamos verificando tu pago" : r?.etiqueta}</h1>
        {error && <p>{error}</p>}
        {r?.reference && <p>Pedido <b className="checkout__ref">{r.reference}</b>{r.total ? <> · {precio(r.total)}</> : null}</p>}
        {!error && <p>{ok ? "Ya estamos alistando tu pedido. Te escribimos por WhatsApp para coordinar la entrega." : r?.etiqueta}</p>}
        <div className="checkout__acciones">
          <Link className="btn btn--rojo" to="/seguimiento">Seguir mi pedido</Link>
          {!ok && !pendiente && <Link className="btn btn--outline" to="/checkout">Intentar de nuevo</Link>}
        </div>
      </div>
    </main>
  );
}
