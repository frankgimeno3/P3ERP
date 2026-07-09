BEGIN;

ALTER TABLE contenidos_db ADD COLUMN IF NOT EXISTS medio text NOT NULL DEFAULT '';
ALTER TABLE contenidos_db ADD COLUMN IF NOT EXISTS producto text NOT NULL DEFAULT '';
ALTER TABLE contenidos_db ADD COLUMN IF NOT EXISTS publicacion text NOT NULL DEFAULT '';
ALTER TABLE contenidos_db ADD COLUMN IF NOT EXISTS url_contenido text NOT NULL DEFAULT '';
ALTER TABLE contenidos_db ADD COLUMN IF NOT EXISTS precio_producto numeric;
ALTER TABLE contenidos_db ADD COLUMN IF NOT EXISTS deadline_publicacion text NOT NULL DEFAULT '';
ALTER TABLE contenidos_db ADD COLUMN IF NOT EXISTS estado_material_contenido text NOT NULL DEFAULT '';
ALTER TABLE contenidos_db ADD COLUMN IF NOT EXISTS fecha_publicacion_publicacion text NOT NULL DEFAULT '';
ALTER TABLE contenidos_db ADD COLUMN IF NOT EXISTS destino_revista boolean NOT NULL DEFAULT false;
ALTER TABLE contenidos_db ADD COLUMN IF NOT EXISTS destino_vidrioperfil boolean NOT NULL DEFAULT false;
ALTER TABLE contenidos_db ADD COLUMN IF NOT EXISTS fecha_maxima_publicacion_vidrioperfil text NOT NULL DEFAULT '';
ALTER TABLE contenidos_db ADD COLUMN IF NOT EXISTS tipo_articulo text NOT NULL DEFAULT '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'contenidos_db'
      AND column_name = 'datos_en_propuesta'
  ) THEN
    UPDATE contenidos_db
    SET
      medio = COALESCE(NULLIF(medio, ''), datos_en_propuesta->>'medio', ''),
      producto = COALESCE(NULLIF(producto, ''), datos_en_propuesta->>'producto', ''),
      publicacion = COALESCE(NULLIF(publicacion, ''), datos_en_propuesta->>'publicacion', ''),
      url_contenido = COALESCE(NULLIF(url_contenido, ''), datos_en_propuesta->>'url_contenido', ''),
      precio_producto = COALESCE(precio_producto, NULLIF(datos_en_propuesta->>'precio_producto', '')::numeric),
      deadline_publicacion = COALESCE(NULLIF(deadline_publicacion, ''), datos_en_propuesta->>'deadline_publicacion', ''),
      estado_material_contenido = COALESCE(NULLIF(estado_material_contenido, ''), datos_en_propuesta->>'estado_material_contenido', ''),
      fecha_publicacion_publicacion = COALESCE(NULLIF(fecha_publicacion_publicacion, ''), datos_en_propuesta->>'fecha_publicacion_publicacion', ''),
      destino_revista = CASE
        WHEN lower(coalesce(datos_en_propuesta->>'destino_revista', '')) IN ('true', 't', '1', 'yes', 'si', 'sí') THEN true
        WHEN lower(coalesce(datos_en_propuesta->>'destino_revista', '')) IN ('false', 'f', '0', 'no') THEN false
        ELSE destino_revista
      END,
      destino_vidrioperfil = CASE
        WHEN lower(coalesce(datos_en_propuesta->>'destino_vidrioperfil', '')) IN ('true', 't', '1', 'yes', 'si', 'sí') THEN true
        WHEN lower(coalesce(datos_en_propuesta->>'destino_vidrioperfil', '')) IN ('false', 'f', '0', 'no') THEN false
        ELSE destino_vidrioperfil
      END,
      fecha_maxima_publicacion_vidrioperfil = COALESCE(NULLIF(fecha_maxima_publicacion_vidrioperfil, ''), datos_en_propuesta->>'fecha_maxima_publicacion_vidrioperfil', ''),
      tipo_articulo = COALESCE(NULLIF(tipo_articulo, ''), datos_en_propuesta->>'tipo_articulo', ''),
      updated_at = now()
    WHERE datos_en_propuesta IS NOT NULL
      AND datos_en_propuesta <> '{}'::jsonb;

    ALTER TABLE contenidos_db DROP COLUMN datos_en_propuesta;
  END IF;
END $$;

COMMIT;
