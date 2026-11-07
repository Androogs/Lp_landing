import { createHash } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TEST } from "./env.js";

const { createApp } = await import("../src/app.js");
const { pool } = await import("../src/db/pool.js");
const { hashPassword } = await import("../src/security/password.js");
const { encrypt } = await import("../src/security/crypto.js");
const { newTotpSecret, totpAt } = await import("../src/security/totp.js");
import type { WompiTransaction } from "../src/modules/payments/wompi.js";

/** Doble de la API de Wompi: aquí "Wompi" responde lo que le digamos */
const wompiApi = new Map<string, WompiTransaction>();
const app = createApp({ fetchTransaction: async (id) => wompiApi.get(id) ?? null });
const ORIGIN = TEST.site;

async function cliente() {
  const agent = request.agent(app);
  const r = await agent.get("/api/csrf");
  const csrf = r.body.csrfToken as string;
  const post = (url: string, body: unknown) => agent.post(url).set("Origin", ORIGIN).set("X-CSRF-Token", csrf).send(body as object);
  return { agent, csrf, post };
}

const pedido = (extra: Record<string, unknown> = {}) => ({
  items: [{ id: "p01", qty: 2 }],
  cliente: { nombre: "María Pérez", telefono: "310 123 4567", direccion: "Calle 31 # 37-56", barrio: "Centro" },
  metodo: "wompi",
  autorizacionDatos: true,
  mayorDeEdad: true,
  ...extra
});

function evento(t: WompiTransaction, secreto = TEST.events, ts = Math.floor(Date.now() / 1000)) {
  const props = ["transaction.id", "transaction.status", "transaction.amount_in_cents"];
  const cadena = `${t.id}${t.status}${t.amount_in_cents}${ts}${secreto}`;
  return { event: "transaction.updated", data: { transaction: t }, signature: { properties: props, checksum: createHash("sha256").update(cadena).digest("hex") }, timestamp: ts, environment: "test" };
}

beforeAll(async () => {
  await pool.query("INSERT INTO users(usuario, nombre_enc, password_hash) VALUES ($1,$2,$3)", ["tienda", encrypt("Tienda Demo", "users.nombre"), await hashPassword("Tienda.Segura.2026")]);
});
afterAll(async () => {
  await pool.end();
});

describe("cabeceras y superficie", () => {
  it("cabeceras de seguridad y sin caché", async () => {
    const r = await request(app).get("/api/health");
    expect(r.status).toBe(200);
    expect(r.headers["x-powered-by"]).toBeUndefined();
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["x-frame-options"]).toBe("SAMEORIGIN");
    expect(r.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(r.headers["cache-control"]).toBe("no-store");
  });
  it("cookie CSRF HttpOnly + SameSite=Strict", async () => {
    const r = await request(app).get("/api/csrf");
    const c = String(r.headers["set-cookie"]);
    expect(c).toMatch(/HttpOnly/);
    expect(c).toMatch(/SameSite=Strict/);
  });
  it("errores internos no revelan detalles", async () => {
    const r = await request(app).get("/api/no-existe");
    expect(r.status).toBe(404);
    expect(JSON.stringify(r.body)).not.toMatch(/stack|Error:/);
  });
});

describe("protección CSRF y origen", () => {
  it("rechaza POST sin Origin", async () => {
    const { agent, csrf } = await cliente();
    const r = await agent.post("/api/orders").set("X-CSRF-Token", csrf).send(pedido());
    expect(r.status).toBe(403);
  });
  it("rechaza POST desde otro dominio", async () => {
    const { agent, csrf } = await cliente();
    const r = await agent.post("/api/orders").set("Origin", "https://atacante.example").set("X-CSRF-Token", csrf).send(pedido());
    expect(r.status).toBe(403);
  });
  it("rechaza POST sin token CSRF o con token falsificado", async () => {
    const { agent } = await cliente();
    expect((await agent.post("/api/orders").set("Origin", ORIGIN).send(pedido())).status).toBe(403);
    expect((await agent.post("/api/orders").set("Origin", ORIGIN).set("X-CSRF-Token", "abc.def").send(pedido())).status).toBe(403);
  });
  it("rechaza envíos de formulario (no JSON)", async () => {
    const { agent, csrf } = await cliente();
    const r = await agent.post("/api/orders").set("Origin", ORIGIN).set("X-CSRF-Token", csrf).type("form").send("a=1");
    expect(r.status).toBe(415);
  });
});

describe("pedidos: el servidor manda en los precios", () => {
  it("ignora precios o totales enviados por el navegador", async () => {
    const { post } = await cliente();
    const r = await post("/api/orders", { ...pedido(), total: 1 });
    expect(r.status).toBe(400); // campo desconocido → rechazado (esquema estricto)
    const ok = await post("/api/orders", { ...pedido(), items: [{ id: "p01", qty: 2 }] });
    expect(ok.status).toBe(201);
    expect(ok.body.total).toBe(177500 * 2);
  });
  it("aplica precio mayorista desde 10 unidades y nunca más caro que el detal en oferta", async () => {
    const { post } = await cliente();
    const r = await post("/api/orders", pedido({ items: [{ id: "p01", qty: 10 }, { id: "p17", qty: 10 }] }));
    expect(r.status).toBe(201);
    expect(r.body.items.find((i: { id: string }) => i.id === "p01").unit).toBe(169800);
    expect(r.body.items.find((i: { id: string }) => i.id === "p17").unit).toBe(49900);
  });
  it("valida datos (celular, campos obligatorios, autorización, productos)", async () => {
    const { post } = await cliente();
    expect((await post("/api/orders", pedido({ cliente: { ...pedido().cliente, telefono: "123" } }))).status).toBe(400);
    expect((await post("/api/orders", pedido({ autorizacionDatos: false }))).status).toBe(400);
    expect((await post("/api/orders", pedido({ items: [{ id: "p9999", qty: 1 }] }))).status).toBe(400);
    expect((await post("/api/orders", pedido({ items: [{ id: "p01'; DROP TABLE orders;--", qty: 1 }] }))).status).toBe(400);
  });
  it("los datos personales quedan cifrados en la base de datos", async () => {
    const { post } = await cliente();
    const r = await post("/api/orders", pedido());
    const { rows } = await pool.query("SELECT * FROM orders WHERE reference = $1", [r.body.reference]);
    const fila = JSON.stringify(rows[0]);
    expect(fila).not.toContain("María");
    expect(fila).not.toContain("3101234567");
    expect(fila).not.toContain("Calle 31");
  });
  it("genera URL de Wompi con firma de integridad calculada en el servidor", async () => {
    const { post } = await cliente();
    const r = await post("/api/orders", pedido());
    const u = new URL(r.body.pago.checkoutUrl);
    expect(u.origin + u.pathname).toBe("https://checkout.wompi.co/p/");
    const firma = createHash("sha256").update(r.body.reference + String(r.body.total * 100) + "COP" + TEST.integrity).digest("hex");
    expect(u.searchParams.get("signature:integrity")).toBe(firma);
    expect(r.body.pago.checkoutUrl).not.toContain(TEST.integrity);
  });
});

describe("seguimiento sin filtrar datos", () => {
  it("exige referencia + celular y no revela si existe", async () => {
    const { post } = await cliente();
    const { body } = await post("/api/orders", pedido({ metodo: "contraentrega" }));
    const ok = await post("/api/orders/track", { reference: body.reference, telefono: "3101234567" });
    expect(ok.status).toBe(200);
    expect(JSON.stringify(ok.body)).not.toMatch(/María|Calle/);
    const mal = await post("/api/orders/track", { reference: body.reference, telefono: "3109999999" });
    const noExiste = await post("/api/orders/track", { reference: "LP-ZZZZZZZZZZ", telefono: "3101234567" });
    expect(mal.status).toBe(404);
    expect(noExiste.status).toBe(404);
    expect(mal.body.error.message).toBe(noExiste.body.error.message);
  });
});

describe("pasarela: webhook de Wompi", () => {
  async function pedidoWompi() {
    const { post } = await cliente();
    return (await post("/api/orders", pedido())).body as { reference: string; total: number };
  }
  const tx = (ref: string, cents: number, status = "APPROVED", id = "tx-" + Math.random().toString(36).slice(2)): WompiTransaction => ({ id, status, reference: ref, amount_in_cents: cents, currency: "COP" });
  const estado = async (ref: string) => (await pool.query("SELECT status FROM orders WHERE reference = $1", [ref])).rows[0].status;

  it("firma inválida → 401 y el pedido no cambia", async () => {
    const o = await pedidoWompi();
    const t = tx(o.reference, o.total * 100);
    wompiApi.set(t.id, t);
    const r = await request(app).post("/api/payments/wompi/webhook").send(evento(t, "secreto-falso-123456"));
    expect(r.status).toBe(401);
    expect(await estado(o.reference)).toBe("PENDIENTE_PAGO");
  });
  it("evento válido y confirmado por la API → PAGADO; repetirlo es idempotente", async () => {
    const o = await pedidoWompi();
    const t = tx(o.reference, o.total * 100);
    wompiApi.set(t.id, t);
    const ev = evento(t);
    expect((await request(app).post("/api/payments/wompi/webhook").send(ev)).status).toBe(200);
    expect(await estado(o.reference)).toBe("PAGADO");
    const r2 = await request(app).post("/api/payments/wompi/webhook").send(ev);
    expect(r2.body.duplicado).toBe(true);
  });
  it("monto distinto al del pedido → NO se marca pagado", async () => {
    const o = await pedidoWompi();
    const t = tx(o.reference, 100); // alguien pagó $1 con la referencia de un pedido grande
    wompiApi.set(t.id, t);
    await request(app).post("/api/payments/wompi/webhook").send(evento(t));
    expect(await estado(o.reference)).toBe("PENDIENTE_PAGO");
  });
  it("evento firmado pero que la API de Wompi no confirma → NO se marca pagado", async () => {
    const o = await pedidoWompi();
    const t = tx(o.reference, o.total * 100);
    wompiApi.set(t.id, { ...t, status: "DECLINED" });
    await request(app).post("/api/payments/wompi/webhook").send(evento(t));
    expect(await estado(o.reference)).toBe("PENDIENTE_PAGO");
  });
  it("evento viejo (replay) → rechazado", async () => {
    const o = await pedidoWompi();
    const t = tx(o.reference, o.total * 100);
    wompiApi.set(t.id, t);
    const r = await request(app).post("/api/payments/wompi/webhook").send(evento(t, TEST.events, Math.floor(Date.now() / 1000) - 10 * 24 * 3600));
    expect(r.status).toBe(400);
    expect(await estado(o.reference)).toBe("PENDIENTE_PAGO");
  });
  it("un pedido pagado no vuelve a rechazado", async () => {
    const o = await pedidoWompi();
    const ok = tx(o.reference, o.total * 100);
    wompiApi.set(ok.id, ok);
    await request(app).post("/api/payments/wompi/webhook").send(evento(ok));
    const no = tx(o.reference, o.total * 100, "DECLINED");
    wompiApi.set(no.id, no);
    await request(app).post("/api/payments/wompi/webhook").send(evento(no));
    expect(await estado(o.reference)).toBe("PAGADO");
  });
  it("la página de resultado consulta a Wompi, no confía en la URL", async () => {
    const o = await pedidoWompi();
    const t = tx(o.reference, o.total * 100);
    wompiApi.set(t.id, t);
    const r = await request(app).get("/api/payments/wompi/result").query({ id: t.id });
    expect(r.body.estado).toBe("PAGADO");
  });
});

describe("autenticación", () => {
  it("login correcto: cookie de sesión HttpOnly/SameSite y precio mayorista en sesión", async () => {
    const { agent, post } = await cliente();
    const r = await post("/api/auth/login", { usuario: "tienda", clave: "Tienda.Segura.2026" });
    expect(r.status).toBe(200);
    const cookies = String(r.headers["set-cookie"]);
    expect(cookies).toMatch(/lp_sid=.*HttpOnly/);
    expect(cookies).toMatch(/SameSite=Strict/);
    const me = await agent.get("/api/auth/me");
    expect(me.body.user.nombre).toBe("Tienda Demo");
    const csrf2 = r.body.csrfToken;
    const o = await agent.post("/api/orders").set("Origin", ORIGIN).set("X-CSRF-Token", csrf2).send(pedido({ items: [{ id: "p01", qty: 1 }] }));
    expect(o.body.items[0].unit).toBe(169800);
  });
  it("la base de datos solo guarda el hash del token de sesión", async () => {
    const { rows } = await pool.query("SELECT id_hash FROM sessions LIMIT 1");
    expect(rows[0].id_hash).toMatch(/^[0-9a-f]{64}$/);
  });
  it("mismo mensaje para usuario inexistente y clave errada; bloqueo tras 5 intentos", async () => {
    const { post } = await cliente();
    const a = await post("/api/auth/login", { usuario: "nadie", clave: "x" });
    const b = await post("/api/auth/login", { usuario: "tienda", clave: "mala" });
    expect(a.body.error.message).toBe(b.body.error.message);
    for (let i = 0; i < 5; i++) await post("/api/auth/login", { usuario: "tienda", clave: "mala" });
    const bloqueado = await post("/api/auth/login", { usuario: "tienda", clave: "Tienda.Segura.2026" });
    expect(bloqueado.status).toBe(401);
    await pool.query("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE usuario = 'tienda'");
  });
  it("logout invalida la sesión en el servidor", async () => {
    const { agent, post } = await cliente();
    const r = await post("/api/auth/login", { usuario: "tienda", clave: "Tienda.Segura.2026" });
    await agent.post("/api/auth/logout").set("Origin", ORIGIN).set("X-CSRF-Token", r.body.csrfToken).send({});
    expect((await agent.get("/api/auth/me")).body.user).toBeNull();
  });
  it("administrador: requiere segundo factor y el API admin rechaza a mayoristas", async () => {
    const secret = newTotpSecret();
    await pool.query("INSERT INTO users(usuario, nombre_enc, password_hash, rol, totp_secret_enc) VALUES ($1,$2,$3,'admin',$4)", [
      "admin", encrypt("Admin", "users.nombre"), await hashPassword("Admin.Segura.2026!"), encrypt(secret, "users.totp")
    ]);
    const { agent, post } = await cliente();
    const sin = await post("/api/auth/login", { usuario: "admin", clave: "Admin.Segura.2026!" });
    expect(sin.body.error.code).toBe("MFA_REQUERIDO");
    const con = await post("/api/auth/login", { usuario: "admin", clave: "Admin.Segura.2026!", codigo: totpAt(secret, Math.floor(Date.now() / 30000)) });
    expect(con.status).toBe(200);
    const lista = await agent.get("/api/admin/orders");
    expect(lista.status).toBe(200);
    expect(lista.body.pedidos[0].cliente.nombre).toBe("María Pérez");
    const m = await cliente();
    const r = await m.post("/api/auth/login", { usuario: "tienda", clave: "Tienda.Segura.2026" });
    expect(r.status).toBe(200);
    expect((await m.agent.get("/api/admin/orders")).status).toBe(403);
  });
  it("el administrador no puede marcar un pedido como PAGADO a mano", async () => {
    const r = await pool.query("SELECT 1");
    expect(r.rowCount).toBe(1);
    const { agent, post } = await cliente();
    const secret = (await pool.query("SELECT totp_secret_enc FROM users WHERE usuario='admin'")).rows[0].totp_secret_enc;
    const { decrypt } = await import("../src/security/crypto.js");
    const login = await post("/api/auth/login", { usuario: "admin", clave: "Admin.Segura.2026!", codigo: totpAt(decrypt(secret, "users.totp"), Math.floor(Date.now() / 30000)) });
    const ref = (await pool.query("SELECT reference FROM orders WHERE status='PENDIENTE_PAGO' LIMIT 1")).rows[0].reference;
    const p = await agent.patch(`/api/admin/orders/${ref}/estado`).set("Origin", ORIGIN).set("X-CSRF-Token", login.body.csrfToken).send({ estado: "PAGADO" });
    expect(p.status).toBe(400);
  });
});

describe("mínimo privilegio y auditoría", () => {
  it("el rol de la aplicación no puede borrar ni alterar la auditoría ni crear tablas", async () => {
    await expect(pool.query("DELETE FROM audit_log")).rejects.toThrow();
    await expect(pool.query("UPDATE audit_log SET event = 'x'")).rejects.toThrow();
    await expect(pool.query("CREATE TABLE hack(x int)")).rejects.toThrow();
    await expect(pool.query("UPDATE products SET detal = 1")).rejects.toThrow();
  });
  it("la auditoría no contiene datos personales", async () => {
    const { rows } = await pool.query("SELECT meta, ip_hash FROM audit_log");
    const todo = JSON.stringify(rows);
    expect(todo).not.toMatch(/María|3101234567|Calle 31/);
    expect(rows.length).toBeGreaterThan(5);
  });
});

describe("habeas data y solicitudes", () => {
  it("radica solicitud con plazo legal", async () => {
    const { post } = await cliente();
    const r = await post("/api/privacidad/solicitudes", { tipo: "supresion", nombre: "María Pérez", telefono: "3101234567", detalle: "Quiero que eliminen mis datos.", autorizacionDatos: true });
    expect(r.status).toBe(201);
    expect(r.body.radicado).toMatch(/^HD-\d{8}-[0-9A-F]{6}$/);
  });
  it("solicitud mayorista cifrada", async () => {
    const { post } = await cliente();
    const r = await post("/api/mayoristas/solicitudes", { negocio: "La Estrella", tipo: "Bar o discoteca", nombre: "Pedro", telefono: "3001112233", ciudad: "Palmira", autorizacionDatos: true });
    expect(r.status).toBe(201);
    const fila = JSON.stringify((await pool.query("SELECT * FROM leads_mayoristas")).rows);
    expect(fila).not.toMatch(/La Estrella|3001112233/);
  });
});
