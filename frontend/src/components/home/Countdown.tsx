import { useEffect, useRef, useState } from "react";

/** Próximo domingo 23:59:59 (las ofertas se renuevan cada lunes) */
function fin(): Date {
  const d = new Date();
  const dias = (7 - d.getDay()) % 7;
  const f = new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias, 23, 59, 59);
  if (f <= d) f.setDate(f.getDate() + 7);
  return f;
}

export function Countdown() {
  const target = useRef(fin());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (target.current.getTime() - now < 0) target.current = fin();
  const ms = target.current.getTime() - now;
  const dd = Math.floor(ms / 864e5);
  const hh = Math.floor(ms / 36e5) % 24;
  const mm = Math.floor(ms / 6e4) % 60;
  const ss = Math.floor(ms / 1e3) % 60;
  const p = (n: number) => (n < 10 ? "0" : "") + n;
  return (
    <span>
      <b>{dd}</b>d <b>{hh}</b>h <b>{p(mm)}</b>m <b>{p(ss)}</b>s
    </span>
  );
}
