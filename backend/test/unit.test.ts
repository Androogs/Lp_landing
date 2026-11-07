import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { TEST } from "./env.js";

describe("cifrado de datos personales", async () => {
  const c = await import("../src/security/crypto.js");
  it("cifra y descifra (AES-256-GCM) con la clave activa", () => {
    const blob = c.encrypt("3101234567", "orders.telefono");
    expect(blob.startsWith("v2.")).toBe(true);
    expect(blob).not.toContain("3101234567");
    expect(c.decrypt(blob, "orders.telefono")).toBe("3101234567");
  });
  it("el mismo dato cifrado dos veces produce resultados distintos (IV aleatorio)", () => {
    expect(c.encrypt("x", "a")).not.toBe(c.encrypt("x", "a"));
  });
  it("detecta alteraciones del texto cifrado", () => {
    const blob = c.encrypt("Calle 31 # 37-56", "orders.direccion");
    const parts = blob.split(".");
    const data = Buffer.from(parts[3]!, "base64url");
    data[0] = data[0]! ^ 1;
    parts[3] = data.toString("base64url");
    expect(() => c.decrypt(parts.join("."), "orders.direccion")).toThrow();
  });
  it("no permite mover un valor cifrado a otra columna (AAD)", () => {
    const blob = c.encrypt("Juan", "orders.nombre");
    expect(() => c.decrypt(blob, "orders.direccion")).toThrow();
  });
  it("índice ciego determinístico y distinto por contexto", () => {
    expect(c.blindIndex("3101234567", "telefono")).toBe(c.blindIndex("3101234567", "telefono"));
    expect(c.blindIndex("3101234567", "telefono")).not.toBe(c.blindIndex("3101234567", "email"));
  });
});

describe("contraseñas", async () => {
  const p = await import("../src/security/password.js");
  it("Argon2id con pepper", async () => {
    const h = await p.hashPassword("Clave-Segura-2026!");
    expect(h.startsWith("$argon2id$")).toBe(true);
    expect(await p.verifyPassword(h, "Clave-Segura-2026!")).toBe(true);
    expect(await p.verifyPassword(h, "otra")).toBe(false);
  });
  it("política de contraseñas", () => {
    expect(p.passwordProblems("corta")).not.toHaveLength(0);
    expect(p.passwordProblems("palmira2026")).not.toHaveLength(0);
    expect(p.passwordProblems("Tienda.Estrella.2026", "demo")).toHaveLength(0);
  });
});

describe("TOTP (RFC 6238)", async () => {
  const t = await import("../src/security/totp.js");
  it("vector oficial de la RFC 6238 (SHA1, T=59s → 94287082, 6 dígitos = 287082)", () => {
    const secret = t.base32Encode(Buffer.from("12345678901234567890"));
    expect(t.totpAt(secret, Math.floor(59 / 30))).toBe("287082");
    expect(t.verifyTotp(secret, "287082", 59_000)).toBe(true);
    expect(t.verifyTotp(secret, "000000", 59_000)).toBe(false);
  });
});

describe("Wompi", async () => {
  const w = await import("../src/modules/payments/wompi.js");
  it("firma de integridad = SHA256(referencia + centavos + moneda + secreto)", () => {
    const esperado = createHash("sha256").update("sk8-438k4-xmxm392-sn2m" + "2490000" + "COP" + TEST.integrity).digest("hex");
    expect(w.integritySignature("sk8-438k4-xmxm392-sn2m", 2490000, "COP")).toBe(esperado);
  });
  it("cadena del checksum de eventos igual al ejemplo de la documentación oficial", () => {
    const ev = {
      event: "transaction.updated",
      data: { transaction: { id: "1234-1610641025-49201", status: "APPROVED", amount_in_cents: 4490000, reference: "x", currency: "COP" } },
      signature: { properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"], checksum: "" },
      timestamp: 1530291411
    };
    const secreto = "prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z";
    expect(w.eventSigningString(ev, secreto)).toBe("1234-1610641025-49201APPROVED44900001530291411prod_events_OcHnIzeBl5socpwByQ4hA52Em3USQ93Z");
    ev.signature.checksum = createHash("sha256").update(w.eventSigningString(ev, secreto)).digest("hex");
    expect(w.verifyEvent(ev, undefined, secreto)).toBe(true);
    expect(w.verifyEvent({ ...ev, timestamp: ev.timestamp + 1 }, undefined, secreto)).toBe(false);
    expect(w.verifyEvent({ ...ev, signature: { ...ev.signature, properties: ["constructor.prototype"] } }, undefined, secreto)).toBe(false);
  });
  it("un pedido pagado no puede pasar a rechazado", () => {
    expect(w.puedeTransitar("PAGADO", "RECHAZADO")).toBe(false);
    expect(w.puedeTransitar("PENDIENTE_PAGO", "PAGADO")).toBe(true);
  });
});
