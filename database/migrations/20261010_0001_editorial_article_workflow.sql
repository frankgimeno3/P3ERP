BEGIN;
ALTER TABLE produccion_control_redaccion
 ADD COLUMN IF NOT EXISTS id_cuenta TEXT,
 ADD COLUMN IF NOT EXISTS pasado_produccion_dia TEXT NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS publicaciones_estado JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS produccion_redaccion_cuenta_idx ON produccion_control_redaccion(id_cuenta);
COMMIT;
