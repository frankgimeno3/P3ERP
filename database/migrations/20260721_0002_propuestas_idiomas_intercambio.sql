ALTER TABLE propuestas_db
  ADD COLUMN IF NOT EXISTS idioma_propuesta text NOT NULL DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS tipo_descuento_final text NOT NULL DEFAULT 'porcentaje',
  ADD COLUMN IF NOT EXISTS transferencias_intercambio jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS comentarios_adicionales text NOT NULL DEFAULT '';

ALTER TABLE servicios_db
  ADD COLUMN IF NOT EXISTS nombre_espanol text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nombre_ingles text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nombre_italiano text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nombre_portugues text NOT NULL DEFAULT '';

UPDATE servicios_db
SET nombre_espanol = COALESCE(NULLIF(nombre_espanol, ''), NULLIF(nombre_servicio_es, ''), id_servicio),
    nombre_ingles = COALESCE(NULLIF(nombre_ingles, ''), NULLIF(nombre_servicio_en, ''), NULLIF(nombre_servicio_es, ''), id_servicio),
    nombre_italiano = COALESCE(NULLIF(nombre_italiano, ''), NULLIF(nombre_servicio_es, ''), id_servicio),
    nombre_portugues = COALESCE(NULLIF(nombre_portugues, ''), NULLIF(nombre_servicio_es, ''), id_servicio);
