CREATE TABLE IF NOT EXISTS revistas_paginas_db (
  id_pagina_publicacion TEXT PRIMARY KEY,
  publication_id TEXT NOT NULL,
  pagina_actual INTEGER NOT NULL,
  has_content BOOLEAN NOT NULL DEFAULT FALSE,
  id_contenido TEXT,
  id_cuenta TEXT,
  nombre_mostrado TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT '',
  pagina_preferente TEXT NOT NULL DEFAULT '',
  ordinal TEXT NOT NULL DEFAULT '1/1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (publication_id, pagina_actual)
);

ALTER TABLE revistas_paginas_db
  ADD COLUMN IF NOT EXISTS pagina_preferente TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'publicaciones_paginas_db'
  ) THEN
    INSERT INTO revistas_paginas_db (
      id_pagina_publicacion,
      publication_id,
      pagina_actual,
      has_content,
      id_contenido,
      id_cuenta,
      nombre_mostrado,
      tipo,
      ordinal,
      created_at,
      updated_at
    )
    SELECT
      id_pagina_publicacion,
      publication_id,
      pagina_actual,
      has_content,
      id_contenido,
      id_cuenta,
      nombre_mostrado,
      tipo,
      ordinal,
      created_at,
      updated_at
    FROM publicaciones_paginas_db
    ON CONFLICT (publication_id, pagina_actual) DO UPDATE
    SET has_content = EXCLUDED.has_content,
        id_contenido = EXCLUDED.id_contenido,
        id_cuenta = EXCLUDED.id_cuenta,
        nombre_mostrado = EXCLUDED.nombre_mostrado,
        tipo = EXCLUDED.tipo,
        ordinal = EXCLUDED.ordinal,
        updated_at = EXCLUDED.updated_at;

    DROP TABLE publicaciones_paginas_db;
  END IF;
END $$;

WITH base_pages(pagina_actual, pagina_preferente) AS (
  VALUES
    (-1, 'portada'),
    (0, 'interior_portada'),
    (1, 'pag_pref_1'),
    (2, 'pag_pref_2'),
    (3, 'pag_pref_3'),
    (4, 'sumario'),
    (5, 'pag_pref_5'),
    (6, 'indice'),
    (7, 'pag_pref_5')
),
revista_publicaciones AS (
  SELECT id_publicacion
  FROM publicaciones_db
  WHERE tipo_publicacion = 'revista'
     OR (tipo_publicacion = '' AND medio_publicacion ILIKE '%revista%')
)
INSERT INTO revistas_paginas_db (id_pagina_publicacion, publication_id, pagina_actual, pagina_preferente)
SELECT
  'pag_' || rp.id_publicacion || '_' || bp.pagina_actual,
  rp.id_publicacion,
  bp.pagina_actual,
  bp.pagina_preferente
FROM revista_publicaciones rp
CROSS JOIN base_pages bp
ON CONFLICT (publication_id, pagina_actual) DO UPDATE
SET pagina_preferente = CASE
  WHEN revistas_paginas_db.pagina_preferente = '' THEN EXCLUDED.pagina_preferente
  ELSE revistas_paginas_db.pagina_preferente
END;

WITH counts AS (
  SELECT publication_id, COUNT(*)::int AS page_count, MAX(pagina_actual)::int AS max_page
  FROM revistas_paginas_db
  GROUP BY publication_id
),
even_counts AS (
  SELECT publication_id, max_page + 1 AS next_page
  FROM counts
  WHERE page_count % 2 = 0
)
INSERT INTO revistas_paginas_db (id_pagina_publicacion, publication_id, pagina_actual, pagina_preferente)
SELECT
  'pag_' || publication_id || '_' || next_page,
  publication_id,
  next_page,
  'pag_pref_' || next_page
FROM even_counts
ON CONFLICT (publication_id, pagina_actual) DO NOTHING;

UPDATE publicaciones_db p
SET num_paginas = pages.page_count,
    updated_at = NOW()
FROM (
  SELECT publication_id, COUNT(*)::int AS page_count
  FROM revistas_paginas_db
  GROUP BY publication_id
) pages
WHERE p.id_publicacion = pages.publication_id
  AND (p.tipo_publicacion = 'revista' OR (p.tipo_publicacion = '' AND p.medio_publicacion ILIKE '%revista%'));
