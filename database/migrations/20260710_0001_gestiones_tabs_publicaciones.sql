BEGIN;

ALTER TABLE gestiones_produccion_db
  ADD COLUMN IF NOT EXISTS id_publicacion_espana TEXT,
  ADD COLUMN IF NOT EXISTS id_publicacion_latam TEXT,
  ADD COLUMN IF NOT EXISTS id_publicacion_hueco TEXT,
  ADD COLUMN IF NOT EXISTS asociada_a_gestiones JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE gestiones_prod_listas
  ADD COLUMN IF NOT EXISTS pestana_lista TEXT NOT NULL DEFAULT 'revista';

ALTER TABLE gestiones_prod_listas
  DROP CONSTRAINT IF EXISTS gestiones_prod_listas_posicion_lista_key;

CREATE UNIQUE INDEX IF NOT EXISTS gestiones_prod_listas_pestana_posicion_idx
  ON gestiones_prod_listas (pestana_lista, posicion_lista);

UPDATE gestiones_prod_listas
SET pestana_lista = 'revista'
WHERE COALESCE(pestana_lista, '') = '';

UPDATE gestiones_produccion_db g
SET
  id_publicacion_hueco = COALESCE(
    NULLIF(id_publicacion_hueco, ''),
    (
      SELECT p.id_publicacion
      FROM jsonb_array_elements_text(COALESCE(g.publicaciones_array, '[]'::jsonb)) AS item(id_publicacion)
      JOIN publicaciones_db p ON p.id_publicacion = item.id_publicacion
      LEFT JOIN revistas_db r ON r.id_revista = p.revista_id
      WHERE p.tipo_publicacion = 'revista'
        AND (
          lower(COALESCE(r.revista, p.nombre_publicacion, '')) LIKE '%hueco%'
          OR lower(COALESCE(r.edicion, p.edicion_publicacion, '')) LIKE '%hueco%'
        )
      LIMIT 1
    )
  ),
  id_publicacion_espana = COALESCE(
    NULLIF(id_publicacion_espana, ''),
    (
      SELECT p.id_publicacion
      FROM jsonb_array_elements_text(COALESCE(g.publicaciones_array, '[]'::jsonb)) AS item(id_publicacion)
      JOIN publicaciones_db p ON p.id_publicacion = item.id_publicacion
      LEFT JOIN revistas_db r ON r.id_revista = p.revista_id
      WHERE p.tipo_publicacion = 'revista'
        AND (
          lower(COALESCE(r.edicion, p.edicion_publicacion, '')) LIKE '%espa%'
          OR lower(COALESCE(r.edicion, p.edicion_publicacion, '')) LIKE '%iberia%'
        )
      LIMIT 1
    )
  ),
  id_publicacion_latam = COALESCE(
    NULLIF(id_publicacion_latam, ''),
    (
      SELECT p.id_publicacion
      FROM jsonb_array_elements_text(COALESCE(g.publicaciones_array, '[]'::jsonb)) AS item(id_publicacion)
      JOIN publicaciones_db p ON p.id_publicacion = item.id_publicacion
      LEFT JOIN revistas_db r ON r.id_revista = p.revista_id
      WHERE p.tipo_publicacion = 'revista'
        AND (
          lower(COALESCE(r.edicion, p.edicion_publicacion, '')) LIKE '%latam%'
          OR lower(COALESCE(r.edicion, p.edicion_publicacion, '')) LIKE '%latina%'
        )
      LIMIT 1
    )
  )
WHERE EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'gestiones_produccion_db'
    AND column_name = 'publicaciones_array'
);

INSERT INTO gestiones_prod_listas (id_lista_gestiones_prod, nombre_lista, array_objetos_gestiones, posicion_lista, pestana_lista)
VALUES
  ('lista_gestiones_vidrioperfil_general', 'General', '[]'::jsonb, 0, 'vidrioperfil'),
  ('lista_gestiones_newsletter_general', 'General', '[]'::jsonb, 0, 'newsletter')
ON CONFLICT (id_lista_gestiones_prod) DO UPDATE
SET nombre_lista = EXCLUDED.nombre_lista,
    pestana_lista = EXCLUDED.pestana_lista;

UPDATE gestiones_prod_listas
SET pestana_lista = 'revista'
WHERE id_lista_gestiones_prod IN ('lista_gestiones_publicado', 'lista_gestiones_cancelado')
  AND COALESCE(pestana_lista, '') = '';

ALTER TABLE gestiones_produccion_db
  DROP COLUMN IF EXISTS publicaciones_array;

COMMIT;
