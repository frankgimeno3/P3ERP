BEGIN;

ALTER TABLE tarifas_db
  ADD COLUMN IF NOT EXISTS estado_tarifa text NOT NULL DEFAULT 'vigente';

UPDATE tarifas_db
SET estado_tarifa = 'vigente'
WHERE estado_tarifa IS NULL OR estado_tarifa = '';

CREATE INDEX IF NOT EXISTS tarifas_db_estado_tarifa_idx ON tarifas_db (estado_tarifa);

COMMIT;
