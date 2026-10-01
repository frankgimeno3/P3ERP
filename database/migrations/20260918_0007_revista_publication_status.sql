UPDATE public.servicios_publicaciones
SET estado_publicacion = CASE
  WHEN lower(btrim(coalesce(estado_publicacion,''))) IN ('publicada','publicado') THEN 'publicada'
  ELSE 'pendiente de publicar'
END
WHERE tipo_publicacion='revista';

ALTER TABLE public.servicios_publicaciones
  ADD CONSTRAINT revista_estado_publicacion_check
  CHECK (tipo_publicacion IS DISTINCT FROM 'revista' OR estado_publicacion IN ('publicada','pendiente de publicar'));
