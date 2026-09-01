BEGIN;

ALTER TABLE ferias_db
  ADD COLUMN IF NOT EXISTS es_relevante boolean NOT NULL DEFAULT false;

UPDATE ferias_db
SET es_relevante = true,
    updated_at = NOW()
WHERE hay_intercambio OR hay_especial OR btrim(id_contrato) <> '';

CREATE INDEX IF NOT EXISTS ferias_db_es_relevante_idx ON ferias_db (es_relevante);

COMMIT;
