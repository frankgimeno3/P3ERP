UPDATE servicios_db
SET medio_servicio_es = regexp_replace(trim(coalesce(medio_servicio_es, '')), '\s+', ' ', 'g'),
    edicion_servicio_es = regexp_replace(trim(coalesce(edicion_servicio_es, '')), '\s+', ' ', 'g'),
    publicacion_servicio_es = regexp_replace(trim(coalesce(publicacion_servicio_es, '')), '\s+', ' ', 'g')
WHERE lower(coalesce(medio_servicio_es, '')) LIKE '%revista%';

UPDATE publicaciones_db
SET medio_publicacion = regexp_replace(trim(coalesce(medio_publicacion, '')), '\s+', ' ', 'g'),
    edicion_publicacion = regexp_replace(trim(coalesce(edicion_publicacion, '')), '\s+', ' ', 'g'),
    detalle_publicacion = regexp_replace(trim(coalesce(detalle_publicacion, '')), '\s+', ' ', 'g');

INSERT INTO publicaciones_db (
  id_publicacion,
  nombre_publicacion,
  estado_publicacion,
  medio_publicacion,
  edicion_publicacion,
  detalle_publicacion,
  tipo_publicacion
)
SELECT
  'publ_srv_' || substr(md5(s.medio || '|' || s.edicion || '|' || s.detalle), 1, 20),
  concat_ws(' · ', s.medio, s.edicion, s.detalle),
  'Pendiente',
  s.medio,
  s.edicion,
  s.detalle,
  'revista'
FROM (
  SELECT DISTINCT
    regexp_replace(trim(coalesce(medio_servicio_es, '')), '\s+', ' ', 'g') AS medio,
    regexp_replace(trim(coalesce(edicion_servicio_es, '')), '\s+', ' ', 'g') AS edicion,
    regexp_replace(trim(coalesce(publicacion_servicio_es, '')), '\s+', ' ', 'g') AS detalle
  FROM servicios_db
  WHERE lower(coalesce(medio_servicio_es, '')) LIKE '%revista%'
) s
WHERE s.medio <> '' AND s.edicion <> '' AND s.detalle <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM publicaciones_db p
    WHERE lower(p.medio_publicacion) = lower(s.medio)
      AND lower(p.edicion_publicacion) = lower(s.edicion)
      AND lower(p.detalle_publicacion) = lower(s.detalle)
  )
ON CONFLICT (id_publicacion) DO NOTHING;
