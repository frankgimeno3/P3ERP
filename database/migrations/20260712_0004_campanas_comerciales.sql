CREATE TABLE IF NOT EXISTS campanas_comerciales (
  id_campana TEXT PRIMARY KEY,
  nombre_campana TEXT NOT NULL DEFAULT '',
  descripcion_campana TEXT NOT NULL DEFAULT '',
  array_ids_campanas_anteriores JSONB NOT NULL DEFAULT '[]'::jsonb,
  array_id_cuentas JSONB NOT NULL DEFAULT '[]'::jsonb,
  tareas_asociadas JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
