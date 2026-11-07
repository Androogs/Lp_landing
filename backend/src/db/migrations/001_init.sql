-- ============================================================
-- Licores Palmira · esquema inicial
-- Datos personales (nombre, teléfono, correo, dirección…) SIEMPRE cifrados en la aplicación (AES-256-GCM):
-- las columnas *_enc nunca contienen texto en claro. *_bidx es un índice ciego (HMAC) para búsquedas exactas.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE products (
  id            text PRIMARY KEY,
  nombre        text NOT NULL,
  categoria     text NOT NULL,
  presentacion  text NOT NULL,
  detal         integer NOT NULL CHECK (detal > 0),
  mayor         integer NOT NULL CHECK (mayor > 0),
  stock         text NOT NULL DEFAULT 'disponible' CHECK (stock IN ('disponible','pocas','agotado')),
  activo        boolean NOT NULL DEFAULT true,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario          citext NOT NULL UNIQUE CHECK (length(usuario) BETWEEN 3 AND 80),
  nombre_enc       text NOT NULL,
  password_hash    text NOT NULL,
  rol              text NOT NULL DEFAULT 'mayorista' CHECK (rol IN ('mayorista','admin')),
  disabled         boolean NOT NULL DEFAULT false,
  failed_attempts  integer NOT NULL DEFAULT 0,
  locked_until     timestamptz,
  last_login_at    timestamptz,
  password_changed_at timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Sesiones de servidor: solo se guarda el HASH del token (si se filtra la tabla, las sesiones no sirven)
CREATE TABLE sessions (
  id_hash       text PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  ip_hash       text,
  ua_hash       text
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_exp_idx ON sessions(expires_at);

-- Autorizaciones de tratamiento de datos (Ley 1581 de 2012, Decreto 1377 de 2013): prueba de la autorización
CREATE TABLE consents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finalidad        text NOT NULL,
  version_politica text NOT NULL,
  texto_hash       text NOT NULL,
  subject_bidx     text,
  ip_hash          text,
  ua_hash          text,
  granted_at       timestamptz NOT NULL DEFAULT now(),
  revoked_at       timestamptz
);
CREATE INDEX consents_subject_idx ON consents(subject_bidx);

CREATE TABLE orders (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference            text NOT NULL UNIQUE,
  status               text NOT NULL CHECK (status IN ('PENDIENTE_PAGO','PAGADO','RECHAZADO','ANULADO','ERROR_PAGO','POR_CONFIRMAR','EN_PREPARACION','EN_CAMINO','ENTREGADO','CANCELADO')),
  payment_method       text NOT NULL CHECK (payment_method IN ('wompi','contraentrega')),
  user_id              uuid REFERENCES users(id) ON DELETE SET NULL,
  items                jsonb NOT NULL,
  total                integer NOT NULL CHECK (total > 0),
  amount_in_cents      bigint NOT NULL CHECK (amount_in_cents = total::bigint * 100),
  currency             text NOT NULL DEFAULT 'COP' CHECK (currency = 'COP'),
  nombre_enc           text,
  telefono_enc         text,
  telefono_bidx        text,
  email_enc            text,
  direccion_enc        text,
  barrio_enc           text,
  notas_enc            text,
  consent_id           uuid REFERENCES consents(id),
  wompi_transaction_id text UNIQUE,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  paid_at              timestamptz,
  anonymized_at        timestamptz
);
CREATE INDEX orders_tel_idx ON orders(telefono_bidx);
CREATE INDEX orders_created_idx ON orders(created_at);

-- Bitácora de eventos de la pasarela (idempotencia y trazabilidad, sin datos de tarjeta)
CREATE TABLE payment_events (
  id               bigserial PRIMARY KEY,
  event_hash       text NOT NULL UNIQUE,
  event            text NOT NULL,
  transaction_id   text,
  reference        text,
  status           text,
  amount_in_cents  bigint,
  signature_ok     boolean NOT NULL,
  outcome          text NOT NULL,
  received_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE leads_mayoristas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_enc   text NOT NULL,
  tipo          text NOT NULL,
  nombre_enc    text NOT NULL,
  telefono_enc  text NOT NULL,
  telefono_bidx text NOT NULL,
  ciudad        text NOT NULL,
  consent_id    uuid NOT NULL REFERENCES consents(id),
  status        text NOT NULL DEFAULT 'NUEVA' CHECK (status IN ('NUEVA','CONTACTADA','APROBADA','RECHAZADA')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Solicitudes de titulares (habeas data): consulta, actualización, rectificación, supresión, revocatoria
CREATE TABLE privacy_requests (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  radicado      text NOT NULL UNIQUE,
  tipo          text NOT NULL CHECK (tipo IN ('consulta','actualizacion','rectificacion','supresion','revocatoria')),
  nombre_enc    text NOT NULL,
  telefono_enc  text,
  email_enc     text,
  detalle_enc   text NOT NULL,
  subject_bidx  text,
  status        text NOT NULL DEFAULT 'RECIBIDA' CHECK (status IN ('RECIBIDA','EN_TRAMITE','RESUELTA')),
  due_at        timestamptz NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz
);

-- Auditoría de seguridad: SOLO inserción (un trigger impide modificarla o borrarla)
CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  event       text NOT NULL,
  actor_id    uuid,
  ip_hash     text,
  request_id  text,
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX audit_event_idx ON audit_log(event, at);

CREATE FUNCTION audit_log_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log es de solo inserción';
END $$;
CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON audit_log FOR EACH ROW EXECUTE FUNCTION audit_log_inmutable();

CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
CREATE TRIGGER orders_touch BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Mínimo privilegio: el rol de la aplicación (si existe) no puede crear/alterar tablas ni borrar auditoría
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lp_app') THEN
    GRANT USAGE ON SCHEMA public TO lp_app;
    GRANT SELECT ON products TO lp_app;
    GRANT SELECT, INSERT, UPDATE ON users, orders, consents, leads_mayoristas, privacy_requests TO lp_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO lp_app;
    GRANT SELECT, INSERT ON payment_events, audit_log TO lp_app;
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO lp_app;
  END IF;
END $$;

-- Segundo factor (TOTP) obligatorio para administradores; el secreto se guarda cifrado
ALTER TABLE users ADD COLUMN totp_secret_enc text;
ALTER TABLE users ADD CONSTRAINT admin_requiere_mfa CHECK (rol <> 'admin' OR totp_secret_enc IS NOT NULL);
