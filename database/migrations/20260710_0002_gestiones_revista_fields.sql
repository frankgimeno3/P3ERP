ALTER TABLE gestiones_produccion_db
  ADD COLUMN IF NOT EXISTS rev_prioridad TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rev_carpeta_produccion TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS id_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS rev_titulo_articulo TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rev_estado_proceso_produccion TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rev_responsable_correccion TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS rev_numero_paginas_actuales INTEGER,
  ADD COLUMN IF NOT EXISTS comentarios TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS gestiones_produccion_db_id_cuenta_idx
  ON gestiones_produccion_db (id_cuenta);
