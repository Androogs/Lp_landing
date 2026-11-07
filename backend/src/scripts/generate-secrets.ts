/* Genera secretos fuertes para el archivo .env (no requiere base de datos ni configuración previa) */
import { randomBytes } from "node:crypto";

const k = () => randomBytes(32).toString("base64");
console.log(`# Secretos generados ${new Date().toISOString()} — guárdalos en un gestor de secretos, nunca en Git
DATA_ENCRYPTION_KEYS=v1:${k()}
DATA_ENCRYPTION_ACTIVE=v1
BLIND_INDEX_KEY=${k()}
PASSWORD_PEPPER=${k()}
CSRF_SECRET=${k()}
POSTGRES_PASSWORD=${randomBytes(24).toString("base64url")}
APP_DB_PASSWORD=${randomBytes(24).toString("base64url")}`);
