BEGIN;

ALTER TABLE contenidos_db
  ADD COLUMN IF NOT EXISTS hoja_prod boolean NOT NULL DEFAULT true;

UPDATE contenidos_db
SET hoja_prod = true,
    updated_at = now()
WHERE hoja_prod IS DISTINCT FROM true;

CREATE INDEX IF NOT EXISTS contenidos_db_hoja_prod_idx ON contenidos_db (hoja_prod);

COMMIT;
