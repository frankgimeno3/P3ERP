BEGIN;

-- Recover historical publications that were stored as free text in contract lines.
INSERT INTO publicaciones_db (
  id_publicacion,
  nombre_publicacion,
  medio_publicacion,
  edicion_publicacion,
  fecha_publicacion,
  estado_publicacion
)
SELECT DISTINCT
  'pub_rec_' || substr(md5(lower(lc.medio || '|' || lc.publicacion)), 1, 18),
  concat_ws(', ', NULLIF(lc.medio, ''), NULLIF(lc.publicacion, '')),
  lc.medio,
  lc.publicacion,
  lc.fecha_publicacion_publicacion,
  'planificada'
FROM gestiones_produccion_db gp
JOIN contenidos_db co ON co.id_contenido = gp.id_contenido
JOIN lineas_contratos_db lc ON lc.id_linea_contrato = co.id_linea_contrato
WHERE gp.tipo_contenido IN ('articulo', 'anuncio')
  AND COALESCE(
    gp.id_publicacion_espana,
    gp.id_publicacion_latam,
    gp.id_publicacion_hueco,
    gp.id_publicacion_quien
  ) IS NULL
  AND NULLIF(lc.publicacion, '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM publicaciones_db p
    WHERE lower(p.nombre_publicacion) LIKE
      '%' || lower((regexp_match(lc.publicacion, '([0-9]+(?:/[0-9]+)?)$'))[1]) || '%'
      AND (
        (lower(lc.medio) LIKE '%hueco%' AND lower(p.nombre_publicacion) LIKE '%hueco%')
        OR (lower(lc.medio) LIKE '%ventana%' AND lower(p.nombre_publicacion) LIKE '%ventana%')
        OR (lower(lc.medio) LIKE '%vidrio%' AND lower(p.nombre_publicacion) LIKE '%vidrio%')
      )
  )
ON CONFLICT (id_publicacion) DO NOTHING;

-- Prefer an existing publication matching both medium and edition/number.
UPDATE gestiones_produccion_db gp
SET id_publicacion_espana = matched.id_publicacion,
    updated_at = NOW()
FROM contenidos_db co
JOIN lineas_contratos_db lc ON lc.id_linea_contrato = co.id_linea_contrato
CROSS JOIN LATERAL (
  SELECT p.id_publicacion
  FROM publicaciones_db p
  WHERE lower(p.nombre_publicacion) LIKE
    '%' || lower((regexp_match(lc.publicacion, '([0-9]+(?:/[0-9]+)?)$'))[1]) || '%'
    AND (
      (lower(lc.medio) LIKE '%hueco%' AND lower(p.nombre_publicacion) LIKE '%hueco%')
      OR (lower(lc.medio) LIKE '%ventana%' AND lower(p.nombre_publicacion) LIKE '%ventana%')
      OR (lower(lc.medio) LIKE '%vidrio%' AND lower(p.nombre_publicacion) LIKE '%vidrio%')
    )
  ORDER BY p.id_publicacion
  LIMIT 1
) matched
WHERE gp.id_contenido = co.id_contenido
  AND gp.tipo_contenido IN ('articulo', 'anuncio')
  AND COALESCE(
    gp.id_publicacion_espana,
    gp.id_publicacion_latam,
    gp.id_publicacion_hueco,
    gp.id_publicacion_quien
  ) IS NULL;

-- A future accepted proposal must carry the structured publication relation.
UPDATE lineas_contratos_db lc
SET id_publicacion = gp.id_publicacion_espana,
    updated_at = NOW()
FROM contenidos_db co
JOIN gestiones_produccion_db gp ON gp.id_contenido = co.id_contenido
WHERE co.id_linea_contrato = lc.id_linea_contrato
  AND NULLIF(lc.id_publicacion, '') IS NULL
  AND NULLIF(gp.id_publicacion_espana, '') IS NOT NULL;

UPDATE contenidos_db co
SET contenido_especifico_id = gp.id_publicacion_espana,
    updated_at = NOW()
FROM gestiones_produccion_db gp
WHERE gp.id_contenido = co.id_contenido
  AND NULLIF(co.contenido_especifico_id, '') IS NULL
  AND NULLIF(gp.id_publicacion_espana, '') IS NOT NULL;

COMMIT;
