/* Crea un usuario mayorista o administrador.
   La contraseña se lee de la variable NUEVA_CLAVE o se pide por consola (no queda en el historial de comandos).
   Uso: npm run user:create -- --usuario tienda-estrella --nombre "Licorería La Estrella" [--rol admin] */
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import { pool } from "../db/pool.js";
import { encrypt } from "../security/crypto.js";
import { hashPassword, passwordProblems } from "../security/password.js";
import { newTotpSecret, otpauthUri } from "../security/totp.js";
const { values } = parseArgs({ options: { usuario: { type: "string" }, nombre: { type: "string" }, rol: { type: "string", default: "mayorista" } } });
const usuario = (values.usuario || "").trim().toLowerCase();
const nombre = (values.nombre || "").trim();
const rol = values.rol === "admin" ? "admin" : "mayorista";
if (!/^[a-z0-9._@-]{3,80}$/.test(usuario) || nombre.length < 3) {
    console.error("Uso: npm run user:create -- --usuario <usuario> --nombre <nombre> [--rol admin]");
    process.exit(1);
}
let clave = process.env.NUEVA_CLAVE || "";
if (!clave) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    clave = await rl.question("Contraseña (mín. 12 caracteres): ");
    rl.close();
}
const problemas = passwordProblems(clave, usuario);
if (problemas.length) {
    console.error("Contraseña rechazada: " + problemas.join("; "));
    process.exit(1);
}
const totp = rol === "admin" ? newTotpSecret() : null;
await pool.query("INSERT INTO users(usuario, nombre_enc, password_hash, rol, totp_secret_enc) VALUES ($1,$2,$3,$4,$5)", [usuario, encrypt(nombre, "users.nombre"), await hashPassword(clave), rol, totp ? encrypt(totp, "users.totp") : null]);
console.log(`Usuario ${rol} creado: ${usuario}`);
if (totp) {
    console.log("\nSegundo factor OBLIGATORIO. Escanea esta URI como código QR en tu app de autenticación (o ingresa el secreto manualmente):");
    console.log(otpauthUri(totp, usuario));
    console.log("Secreto: " + totp + "\nGuárdalo solo en la app; no lo envíes por chat ni correo.");
}
await pool.end();
