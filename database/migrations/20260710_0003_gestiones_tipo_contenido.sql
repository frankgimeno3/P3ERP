ALTER TABLE gestiones_produccion_db
  ADD COLUMN IF NOT EXISTS tipo_contenido TEXT NOT NULL DEFAULT 'articulo',
  ADD COLUMN IF NOT EXISTS comentarios TEXT NOT NULL DEFAULT '';
