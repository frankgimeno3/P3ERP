BEGIN;

ALTER TABLE cuentas_db
  ALTER COLUMN ferias DROP DEFAULT;

ALTER TABLE cuentas_db
  ALTER COLUMN ferias TYPE jsonb
  USING CASE
    WHEN ferias IS NULL OR btrim(ferias::text) = '' THEN '[]'::jsonb
    WHEN left(btrim(ferias::text), 1) = '[' THEN ferias::jsonb
    ELSE jsonb_build_array(ferias::text)
  END;

ALTER TABLE cuentas_db
  ALTER COLUMN ferias SET DEFAULT '[]'::jsonb,
  ALTER COLUMN ferias SET NOT NULL;

ALTER TABLE contratos_db
  ADD COLUMN IF NOT EXISTS id_propuesta text NOT NULL DEFAULT '';

UPDATE contratos_db c
SET id_propuesta = p.id_propuesta
FROM propuestas_db p
WHERE c.id_propuesta = ''
  AND p.id_cuenta_propuesta = c.id_cuenta_contrato
  AND coalesce(p.id_contacto_propuesta, '') = coalesce(c.id_contacto_contrato, '');

CREATE INDEX IF NOT EXISTS contratos_db_id_propuesta_idx ON contratos_db (id_propuesta);

COMMIT;
