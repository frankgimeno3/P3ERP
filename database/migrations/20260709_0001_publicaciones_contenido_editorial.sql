BEGIN;

ALTER TABLE publicaciones_db
  ADD COLUMN IF NOT EXISTS contenido_editorial TEXT NOT NULL DEFAULT '';

COMMIT;
