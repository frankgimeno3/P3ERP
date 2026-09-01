ALTER TABLE propuestas_db
  ADD COLUMN IF NOT EXISTS moneda text NOT NULL DEFAULT '€';

UPDATE propuestas_db SET moneda = '€' WHERE moneda IS NULL OR trim(moneda) = '';

ALTER TABLE lineas_propuestas_db
  ADD COLUMN IF NOT EXISTS tipo_descuento_producto text NOT NULL DEFAULT 'porcentaje';

ALTER TABLE servicios_db
  ADD COLUMN IF NOT EXISTS medio_servicio_it text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS edicion_servicio_it text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS publicacion_servicio_it text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nombre_servicio_it text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS medio_servicio_pt text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS edicion_servicio_pt text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS publicacion_servicio_pt text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nombre_servicio_pt text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS disponibilidad text NOT NULL DEFAULT 'Ofrecible',
  ADD COLUMN IF NOT EXISTS comentarios text NOT NULL DEFAULT '';

UPDATE servicios_db
SET medio_servicio_en = COALESCE(NULLIF(medio_servicio_en, ''), medio_servicio_es),
    edicion_servicio_en = COALESCE(NULLIF(edicion_servicio_en, ''), edicion_servicio_es),
    publicacion_servicio_en = COALESCE(NULLIF(publicacion_servicio_en, ''), publicacion_servicio_es),
    nombre_servicio_en = COALESCE(NULLIF(nombre_servicio_en, ''), nombre_servicio_es),
    medio_servicio_it = COALESCE(NULLIF(medio_servicio_it, ''), medio_servicio_es),
    edicion_servicio_it = COALESCE(NULLIF(edicion_servicio_it, ''), edicion_servicio_es),
    publicacion_servicio_it = COALESCE(NULLIF(publicacion_servicio_it, ''), publicacion_servicio_es),
    nombre_servicio_it = COALESCE(NULLIF(nombre_servicio_it, ''), NULLIF(nombre_italiano, ''), nombre_servicio_es),
    medio_servicio_pt = COALESCE(NULLIF(medio_servicio_pt, ''), medio_servicio_es),
    edicion_servicio_pt = COALESCE(NULLIF(edicion_servicio_pt, ''), edicion_servicio_es),
    publicacion_servicio_pt = COALESCE(NULLIF(publicacion_servicio_pt, ''), publicacion_servicio_es),
    nombre_servicio_pt = COALESCE(NULLIF(nombre_servicio_pt, ''), NULLIF(nombre_portugues, ''), nombre_servicio_es),
    disponibilidad = CASE WHEN disponibilidad = 'Oculto' THEN 'Oculto' ELSE 'Ofrecible' END;

ALTER TABLE publicaciones_db
  ADD COLUMN IF NOT EXISTS medio_publicacion_es text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS medio_publicacion_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS medio_publicacion_it text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS medio_publicacion_pt text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS edicion_publicacion_es text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS edicion_publicacion_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS edicion_publicacion_it text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS edicion_publicacion_pt text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS detalle_publicacion_es text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS detalle_publicacion_en text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS detalle_publicacion_it text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS detalle_publicacion_pt text NOT NULL DEFAULT '';

UPDATE publicaciones_db
SET medio_publicacion_es = COALESCE(NULLIF(medio_publicacion_es, ''), medio_publicacion),
    medio_publicacion_en = COALESCE(NULLIF(medio_publicacion_en, ''), medio_publicacion),
    medio_publicacion_it = COALESCE(NULLIF(medio_publicacion_it, ''), medio_publicacion),
    medio_publicacion_pt = COALESCE(NULLIF(medio_publicacion_pt, ''), medio_publicacion),
    edicion_publicacion_es = COALESCE(NULLIF(edicion_publicacion_es, ''), edicion_publicacion),
    edicion_publicacion_en = COALESCE(NULLIF(edicion_publicacion_en, ''), edicion_publicacion),
    edicion_publicacion_it = COALESCE(NULLIF(edicion_publicacion_it, ''), edicion_publicacion),
    edicion_publicacion_pt = COALESCE(NULLIF(edicion_publicacion_pt, ''), edicion_publicacion),
    detalle_publicacion_es = COALESCE(NULLIF(detalle_publicacion_es, ''), detalle_publicacion),
    detalle_publicacion_en = COALESCE(NULLIF(detalle_publicacion_en, ''), detalle_publicacion),
    detalle_publicacion_it = COALESCE(NULLIF(detalle_publicacion_it, ''), detalle_publicacion),
    detalle_publicacion_pt = COALESCE(NULLIF(detalle_publicacion_pt, ''), detalle_publicacion);
