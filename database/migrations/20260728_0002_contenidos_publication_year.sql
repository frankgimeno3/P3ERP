BEGIN;

-- The publication catalog is authoritative for the year shown in production.
UPDATE contenidos_db c
SET ano_publicacion = CASE
      WHEN length(split_part(p.fecha_publicacion, '/', 3)) = 2
        THEN '20' || split_part(p.fecha_publicacion, '/', 3)
      ELSE split_part(p.fecha_publicacion, '/', 3)
    END,
    updated_at = NOW()
FROM publicaciones_db p
WHERE p.id_publicacion = COALESCE(
    NULLIF(c.contenido_especifico_id, ''),
    NULLIF(c.id_publicacion, '')
  )
  AND split_part(p.fecha_publicacion, '/', 3) <> ''
  AND c.ano_publicacion IS DISTINCT FROM CASE
    WHEN length(split_part(p.fecha_publicacion, '/', 3)) = 2
      THEN '20' || split_part(p.fecha_publicacion, '/', 3)
    ELSE split_part(p.fecha_publicacion, '/', 3)
  END;

COMMIT;
