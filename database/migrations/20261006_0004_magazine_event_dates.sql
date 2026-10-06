ALTER TABLE servicios_publicaciones
  ADD COLUMN IF NOT EXISTS fecha_pedir_materiales TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS deadline_real_materiales TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_envio_imprenta TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_estimada_impresion TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_envio_revistas TEXT NOT NULL DEFAULT '';
