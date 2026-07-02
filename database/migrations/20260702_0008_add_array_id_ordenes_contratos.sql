BEGIN;

ALTER TABLE contratos_db
  ADD COLUMN IF NOT EXISTS array_id_ordenes jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE contratos_db c
SET array_id_ordenes = COALESCE(ordenes.ids, '[]'::jsonb),
    updated_at = now()
FROM (
  SELECT
    id_contrato,
    jsonb_agg(id_orden ORDER BY id_orden) AS ids
  FROM ordenes_db
  GROUP BY id_contrato
) ordenes
WHERE ordenes.id_contrato = c.id_contrato;

CREATE INDEX IF NOT EXISTS contratos_db_array_id_ordenes_idx ON contratos_db USING gin (array_id_ordenes);

COMMIT;
