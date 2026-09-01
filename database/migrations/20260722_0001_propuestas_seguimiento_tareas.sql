ALTER TABLE propuestas_db
  ADD COLUMN IF NOT EXISTS comentarios_seguimiento TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS acciones_proxima_gestion TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_proxima_gestion DATE;

ALTER TABLE tareas_db ADD COLUMN IF NOT EXISTS propuesta_id TEXT;

DROP INDEX IF EXISTS tareas_db_propuesta_id_uidx;

CREATE INDEX IF NOT EXISTS tareas_db_propuesta_id_idx
  ON tareas_db (propuesta_id)
  WHERE propuesta_id IS NOT NULL AND propuesta_id <> '';

CREATE INDEX IF NOT EXISTS propuestas_db_fecha_proxima_gestion_idx
  ON propuestas_db (fecha_proxima_gestion);
