ALTER TABLE gestiones_produccion_db
  ADD COLUMN IF NOT EXISTS medios_servicio_revista JSONB NOT NULL DEFAULT '[]'::jsonb;
