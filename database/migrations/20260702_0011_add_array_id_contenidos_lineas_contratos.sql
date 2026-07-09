ALTER TABLE lineas_contratos_db
  ADD COLUMN IF NOT EXISTS array_id_contenidos jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS lineas_contratos_db_array_id_contenidos_idx
  ON lineas_contratos_db USING gin (array_id_contenidos);
