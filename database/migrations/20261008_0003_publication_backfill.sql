-- One-time historical normalization moved out of request paths. No legacy table is dropped.
DO $legacy$ BEGIN IF to_regclass(current_schema() || '.publicaciones_paginas_db') IS NOT NULL THEN RAISE EXCEPTION 'Revisar y migrar publicaciones_paginas_db antes de retirar la inicializacion de lecturas'; END IF; END $legacy$;

INSERT INTO servicios_publicaciones (
      id_publicacion,
      nombre_publicacion,
      fecha_publicacion,
      estado_publicacion,
      medio_publicacion,
      edicion_publicacion,
      detalle_publicacion,
      tipo_publicacion,
      revista_id,
      numero_publicacion,
      deadline_materiales
    )
    SELECT
      'pub_' || r.id_revista,
      concat_ws(' ', r.revista, r.edicion, NULLIF(r.publicacion, '')),
      COALESCE(r.fecha_publicacion, ''),
      'pendiente de publicar',
      'revista',
      COALESCE(r.edicion, ''),
      COALESCE(r.revista, ''),
      'revista',
      r.id_revista,
      COALESCE(r.publicacion, ''),
      COALESCE(r.deadline_materiales, '')
    FROM servicios_revistas r
    WHERE COALESCE(r.id_revista, '') <> ''
    ON CONFLICT (id_publicacion) DO NOTHING;

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
      FROM servicios_publicaciones
      WHERE tipo_publicacion = 'revista' OR (tipo_publicacion = '' AND medio_publicacion ILIKE '%revista%')
    )
    INSERT INTO servicios_paginas_revista (id_pagina_publicacion, publication_id, pagina_actual, pagina_preferente, tipo)
    SELECT
      'pag_' || rp.id_publicacion || '_' || bp.pagina_actual,
      rp.id_publicacion,
      bp.pagina_actual,
      bp.pagina_preferente,
      CASE
        WHEN bp.pagina_preferente = 'portada' THEN 'Portada'
        WHEN bp.pagina_preferente = 'indice' THEN 'Indice'
        WHEN bp.pagina_preferente = 'sumario' THEN 'Sumario'
        WHEN bp.pagina_preferente = 'interior_portada' THEN 'Interior portada'
        WHEN bp.pagina_preferente LIKE 'pag_pref_%' THEN 'Anuncio'
        ELSE ''
      END
    FROM revista_publicaciones rp
    CROSS JOIN base_pages bp
    ON CONFLICT (publication_id, pagina_actual) DO UPDATE
    SET pagina_preferente = CASE
      WHEN servicios_paginas_revista.pagina_preferente = '' THEN EXCLUDED.pagina_preferente
      ELSE servicios_paginas_revista.pagina_preferente
    END
    WHERE servicios_paginas_revista.pagina_preferente = '' AND EXCLUDED.pagina_preferente <> '';

UPDATE servicios_paginas_revista
    SET tipo = CASE
      WHEN pagina_preferente = 'portada' THEN 'Portada'
      WHEN pagina_preferente = 'indice' THEN 'Indice'
      WHEN pagina_preferente = 'sumario' THEN 'Sumario'
      WHEN pagina_preferente = 'interior_portada' THEN 'Interior portada'
      WHEN pagina_preferente LIKE 'pag_pref_%' THEN 'Anuncio'
      ELSE tipo
    END,
    updated_at = NOW()
    WHERE (pagina_preferente IN ('portada', 'indice', 'sumario', 'interior_portada') OR pagina_preferente LIKE 'pag_pref_%')
      AND tipo IS DISTINCT FROM CASE
        WHEN pagina_preferente = 'portada' THEN 'Portada'
        WHEN pagina_preferente = 'indice' THEN 'Indice'
        WHEN pagina_preferente = 'sumario' THEN 'Sumario'
        WHEN pagina_preferente = 'interior_portada' THEN 'Interior portada'
        WHEN pagina_preferente LIKE 'pag_pref_%' THEN 'Anuncio' ELSE tipo END;

WITH counts AS (
      SELECT publication_id, COUNT(*)::int AS page_count, MAX(pagina_actual)::int AS max_page
      FROM servicios_paginas_revista
      GROUP BY publication_id
    ),
    even_counts AS (
      SELECT publication_id, max_page + 1 AS next_page
      FROM counts
      WHERE page_count % 2 = 0
    )
    INSERT INTO servicios_paginas_revista (id_pagina_publicacion, publication_id, pagina_actual, pagina_preferente, tipo)
    SELECT
      'pag_' || publication_id || '_' || next_page,
      publication_id,
      next_page,
      'pag_pref_' || next_page,
      'Anuncio'
    FROM even_counts
    ON CONFLICT (publication_id, pagina_actual) DO NOTHING;

UPDATE servicios_publicaciones p
    SET num_paginas = pages.page_count,
        updated_at = NOW()
    FROM (
      SELECT publication_id, COUNT(*)::int AS page_count
      FROM servicios_paginas_revista
      GROUP BY publication_id
    ) pages
    WHERE p.id_publicacion = pages.publication_id
      AND (p.tipo_publicacion = 'revista' OR (p.tipo_publicacion = '' AND p.medio_publicacion ILIKE '%revista%'))
      AND p.num_paginas IS DISTINCT FROM pages.page_count;

DO $legacy$ BEGIN IF to_regclass(current_schema() || '.newsletters_db') IS NOT NULL THEN
INSERT INTO servicios_newsletters (id_newsletter, nombre_newsletter, edicion, titulo, estado, created_at, updated_at)
    SELECT id_newsletter, COALESCE(titulo, ''), COALESCE(estado, ''), COALESCE(titulo, ''), COALESCE(estado, 'activo'), created_at, updated_at
    FROM newsletters_db
    ON CONFLICT (id_newsletter) DO NOTHING;
END IF; END $legacy$;

DO $legacy$ BEGIN IF to_regclass(current_schema() || '.newsletters_db') IS NOT NULL THEN
INSERT INTO servicios_publicaciones (
      id_publicacion,
      nombre_publicacion,
      fecha_publicacion,
      estado_publicacion,
      medio_publicacion,
      detalle_publicacion,
      tipo_publicacion,
      newsletter_id,
      numero_publicacion,
      deadline_materiales,
      link,
      cuenta_id,
      contenido_id
    )
    SELECT
      'pub_' || n.id_newsletter,
      COALESCE(n.titulo, n.id_newsletter),
      COALESCE(n.fecha_publicacion, ''),
      COALESCE(n.estado, 'Pendiente'),
      'newsletter',
      COALESCE(n.titulo, ''),
      'newsletter',
      n.id_newsletter,
      COALESCE(NULLIF(regexp_replace(n.id_newsletter, '\D', '', 'g'), ''), '1'),
      COALESCE(n.deadline_materiales, ''),
      COALESCE(n.link, ''),
      n.cuenta_id,
      n.contenido_id
    FROM newsletters_db n
    WHERE COALESCE(n.id_newsletter, '') <> ''
    ON CONFLICT (id_publicacion) DO NOTHING;
END IF; END $legacy$;
