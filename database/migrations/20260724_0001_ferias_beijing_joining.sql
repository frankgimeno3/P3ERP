BEGIN;

ALTER TABLE ferias_db
  ADD COLUMN IF NOT EXISTS periodicidad text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tematica text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_texto_original text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_inicio date,
  ADD COLUMN IF NOT EXISTS fecha_fin date,
  ADD COLUMN IF NOT EXISTS fuente_importacion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fuente_fila integer;

CREATE UNIQUE INDEX IF NOT EXISTS ferias_db_fuente_fila_uq
  ON ferias_db (fuente_importacion, fuente_fila)
  WHERE fuente_importacion <> '' AND fuente_fila IS NOT NULL;

CREATE INDEX IF NOT EXISTS ferias_db_fecha_inicio_idx ON ferias_db (fecha_inicio);
CREATE INDEX IF NOT EXISTS ferias_db_tematica_idx ON ferias_db (tematica);

UPDATE ferias_db
SET
  fecha_inicio = CASE
    WHEN fecha_incio ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN to_date(fecha_incio, 'DD/MM/YYYY')
    ELSE fecha_inicio
  END,
  fecha_fin = CASE
    WHEN fecha_finalizacion ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN to_date(fecha_finalizacion, 'DD/MM/YYYY')
    ELSE fecha_fin
  END
WHERE fecha_inicio IS NULL OR fecha_fin IS NULL;

COMMIT;
