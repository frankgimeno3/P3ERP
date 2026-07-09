BEGIN;

CREATE TABLE IF NOT EXISTS tareas_db (
  id_tarea TEXT PRIMARY KEY,
  agente TEXT NOT NULL DEFAULT '',
  titulo TEXT NOT NULL DEFAULT '',
  contenido TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'pendiente',
  prioridad TEXT NOT NULL DEFAULT 'media',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS tareas_db_agente_idx ON tareas_db (agente);
CREATE INDEX IF NOT EXISTS tareas_db_estado_idx ON tareas_db (estado);
CREATE INDEX IF NOT EXISTS tareas_db_prioridad_idx ON tareas_db (prioridad);

COMMIT;
