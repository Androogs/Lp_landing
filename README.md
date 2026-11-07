# Licores Palmira · Plataforma web (frontend + backend)

| Carpeta | Qué es | Tecnología |
|---|---|---|
| `frontend/` | Sitio web: mismas páginas y estilos de la versión 2, más checkout, resultado de pago, seguimiento y habeas data conectados al API | React 18 · Vite 7 · TypeScript · React Router 7 |
| `backend/` | API: pedidos con precios del servidor, pagos con Wompi, cuentas mayoristas, administración, datos personales cifrados | Node 22 · Express · TypeScript · PostgreSQL 16 · zod · Argon2id |
| `infra/` | Despliegue: Nginx (TLS, CSP, límites), Docker Compose con redes aisladas, roles de base de datos, copias cifradas | Docker · Nginx · PostgreSQL |
| `frontend/PORTADA-3D.md` | **Portada nueva**: botella 3D guiada por scroll (Three.js + GSAP), tema oscuro solo en el inicio, cómo editarla | — |
| `docs/SEGURIDAD.md` | **Arquitectura de seguridad, cumplimiento Ley 1581, pagos, respuesta a incidentes y lista de verificación para salir en vivo** | — |

---

## Desarrollo local

Requisitos: Node 22 LTS y PostgreSQL 16 local (o `docker run -p 5432:5432 -e POSTGRES_PASSWORD=dev postgres:16-alpine`).

```bash
# 1) Base de datos: un dueño para migraciones y un rol de mínimo privilegio para el API
psql -U postgres -c "CREATE DATABASE licorespalmira"
psql -U postgres -c "CREATE ROLE lp_app LOGIN PASSWORD 'dev-app'"
psql -U postgres -c "GRANT CONNECT ON DATABASE licorespalmira TO lp_app"

# 2) Backend
cd backend
npm ci
cp .env.example .env            # completar con: npm run secrets:generate
#    PUBLIC_SITE_URL=http://127.0.0.1:5173 · llaves de SANDBOX de Wompi
DATABASE_URL=postgres://postgres:<clave>@127.0.0.1:5432/licorespalmira npm run db:migrate
DATABASE_URL=postgres://postgres:<clave>@127.0.0.1:5432/licorespalmira npm run db:seed
npm run user:create -- --usuario tienda-demo --nombre "Tienda de prueba"
npm run dev                     # API en http://127.0.0.1:3000

# 3) Frontend (otra terminal): /api se redirige solo al backend
cd frontend
npm ci
npm run dev                     # http://127.0.0.1:5173
```

### Pruebas

```bash
cd backend && npm test      # 41 pruebas de seguridad contra PostgreSQL (ver test/global-setup.ts para la conexión)
cd frontend && npm run build
```

El backend espera, por defecto, PostgreSQL en el socket `/tmp`, puerto 5433. Se cambia con `TEST_DB_OWNER_URL` y `TEST_DB_APP_URL`.

> Nota: si `npm install <paquete>` falla con `Cannot read properties of null (reading 'edgesOut')` (error conocido de npm 10 con `vitest` 4), usa `npm install --legacy-peer-deps <paquete>`. `npm ci` funciona normal con el `package-lock.json` incluido.

---

## Producción

```bash
cd infra
cp .env.example .env && chmod 600 .env     # completar (llaves de PRODUCCIÓN de Wompi)
# Certificado TLS (primera vez): certbot certonly --webroot -w ./certbot -d licorespalmira.com -d www.licorespalmira.com
docker compose up -d --build
docker compose run --rm api node dist/scripts/create-user.js --usuario admin --nombre "Administrador" --rol admin
```

Luego sigue **la lista de verificación de `docs/SEGURIDAD.md` §10** antes de anunciar el sitio.

---

## Tareas frecuentes

| Quiero… | Cómo |
|---|---|
| Cambiar precios o productos | Editar `frontend/src/data/data.ts` → `cd backend && npm run catalog:export && npm run db:seed` (el servidor cobra con estos precios) |
| Crear una cuenta mayorista | `npm run user:create -- --usuario <usuario> --nombre "<negocio>"` |
| Crear un administrador (con 2FA) | `npm run user:create -- --usuario <usuario> --nombre "<nombre>" --rol admin` → escanear la URI en la app de autenticación |
| Ver pedidos, solicitudes y habeas data | API admin: `GET /api/admin/orders`, `/api/admin/leads`, `/api/admin/privacy` (el panel visual es el siguiente paso) |
| Cambiar estado logístico | `PATCH /api/admin/orders/:referencia/estado` (`EN_PREPARACION`, `EN_CAMINO`, `ENTREGADO`, `CANCELADO`) |
| Rotar la clave de cifrado | Ver `docs/SEGURIDAD.md` §7 |

## API pública

| Método y ruta | Uso |
|---|---|
| `GET /api/csrf` | Token CSRF (lo maneja `frontend/src/lib/api.ts`) |
| `POST /api/orders` | Crear pedido (`wompi` o `contraentrega`) |
| `POST /api/orders/track` | Seguimiento (referencia + celular) |
| `GET /api/payments/wompi/result?id=` | Estado tras volver de Wompi |
| `POST /api/payments/wompi/webhook` | Eventos de Wompi (firmados) |
| `POST /api/auth/login` · `/logout` · `/logout-all` · `GET /api/auth/me` | Sesión |
| `POST /api/mayoristas/solicitudes` | Solicitud de cuenta mayorista |
| `POST /api/privacidad/solicitudes` | Derechos del titular (habeas data) |
