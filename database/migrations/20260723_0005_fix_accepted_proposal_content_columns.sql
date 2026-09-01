BEGIN;

ALTER TABLE contenidos_db
  ADD COLUMN IF NOT EXISTS servicio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS contenido_especifico_id text NOT NULL DEFAULT '';

COMMIT;
