BEGIN;

ALTER TABLE cuentas_db
  ADD COLUMN IF NOT EXISTS nombre_empresa TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pais_cuenta TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS id_agente TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS descripcion_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS actividades_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS presente_en_qq BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS fuente_novedades_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS datos_comerciales JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS array_direcciones_cuenta JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS array_contactos_cuenta JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS array_comentarios_cuenta JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS cuentas_db_nombre_empresa_idx ON cuentas_db (nombre_empresa);
CREATE INDEX IF NOT EXISTS cuentas_db_id_agente_idx ON cuentas_db (id_agente);
CREATE INDEX IF NOT EXISTS cuentas_db_created_at_idx ON cuentas_db (created_at);

COMMIT;
