BEGIN;

ALTER TABLE newsleters_db
  ADD COLUMN IF NOT EXISTS nombre_newsletter TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS edicion TEXT NOT NULL DEFAULT '';

UPDATE newsleters_db
SET nombre_newsletter = COALESCE(NULLIF(nombre_newsletter, ''), NULLIF(titulo, ''), id_newsletter),
    edicion = COALESCE(NULLIF(edicion, ''), NULLIF(estado, ''), '')
WHERE COALESCE(nombre_newsletter, '') = '' OR COALESCE(edicion, '') = '';

WITH hueco AS (
  SELECT
    r.id_revista,
    r.edicion AS old_edicion,
    p.id_publicacion,
    p.numero_publicacion AS old_numero
  FROM revistas_db r
  JOIN publicaciones_db p ON p.revista_id = r.id_revista
  WHERE r.revista = 'Hueco Arquitectura'
    AND r.edicion IN ('1/2', '2/2')
    AND p.numero_publicacion ~ '^[0-9]{4}$'
),
update_revistas AS (
  UPDATE revistas_db r
  SET edicion = h.old_numero,
      updated_at = NOW()
  FROM hueco h
  WHERE r.id_revista = h.id_revista
  RETURNING r.id_revista
)
UPDATE publicaciones_db p
SET numero_publicacion = h.old_edicion,
    edicion_publicacion = h.old_numero,
    updated_at = NOW()
FROM hueco h
WHERE p.id_publicacion = h.id_publicacion;

WITH revistas AS (
  SELECT
    p.id_publicacion,
    COALESCE(
      NULLIF(regexp_replace(r.edicion, '\D', '', 'g'), ''),
      NULLIF(regexp_replace(p.numero_publicacion, '\D', '', 'g'), ''),
      '2026'
    )::int AS ano,
    row_number() OVER (
      PARTITION BY COALESCE(
        NULLIF(regexp_replace(r.edicion, '\D', '', 'g'), ''),
        NULLIF(regexp_replace(p.numero_publicacion, '\D', '', 'g'), ''),
        '2026'
      )
      ORDER BY r.revista, r.edicion, p.numero_publicacion, p.id_publicacion
    ) AS rn
  FROM publicaciones_db p
  JOIN revistas_db r ON r.id_revista = p.revista_id
  WHERE p.tipo_publicacion = 'revista'
),
fechas AS (
  SELECT
    id_publicacion,
    CASE
      WHEN ano <= 2026 THEN DATE '2026-08-15' + ((rn - 1) * INTERVAL '7 days')
      ELSE make_date(ano, 2, 15) + ((rn - 1) * INTERVAL '14 days')
    END::date AS fecha
  FROM revistas
)
UPDATE publicaciones_db p
SET fecha_publicacion = to_char(f.fecha, 'DD/MM/YYYY'),
    deadline_materiales = to_char(f.fecha - INTERVAL '21 days', 'DD/MM/YYYY'),
    updated_at = NOW()
FROM fechas f
WHERE p.id_publicacion = f.id_publicacion;

WITH soportes(nombre_newsletter, edicion) AS (
  VALUES
    ('Newsletter vidrio', 'General Iberia'),
    ('Newsletter vidrio', 'General América Latina'),
    ('Newsletter vidrio', 'Herrajes Iberia'),
    ('Newsletter vidrio', 'Herrajes América Latina'),
    ('Newsletter vidrio', 'Maquinaria Iberia'),
    ('Newsletter vidrio', 'Maquinaria América Latina'),
    ('Newsletter arquitectura', 'General Iberia'),
    ('Newsletter Ventanas, Puertas, Cerramientos', 'General Iberia'),
    ('Newsletter Ventanas, Puertas, Cerramientos', 'General América Latina'),
    ('Newsletter Ventanas, Puertas, Cerramientos', 'Maquinaria Iberia'),
    ('Newsletter Ventanas, Puertas, Cerramientos', 'Maquinaria América Latina'),
    ('Newsletter Ventanas, Puertas, Cerramientos', 'Herrajes Iberia'),
    ('Newsletter Ventanas, Puertas, Cerramientos', 'Herrajes América Latina'),
    ('Newsletter Ventanas, Puertas, Cerramientos', 'Protección Solar Iberia'),
    ('Newsletter Ventanas, Puertas, Cerramientos', 'Protección Solar América Latina'),
    ('Newsletter Ventanas, Puertas, Cerramientos', 'Puertas Iberia'),
    ('Newsletter Ventanas, Puertas, Cerramientos', 'Puertas América Latina')
),
insert_soportes AS (
  INSERT INTO newsleters_db (id_newsletter, nombre_newsletter, edicion, titulo, descripcion, estado)
  SELECT
    'news_' || lower(regexp_replace(nombre_newsletter || '_' || edicion, '[^a-zA-Z0-9]+', '_', 'g')),
    nombre_newsletter,
    edicion,
    nombre_newsletter,
    edicion,
    edicion
  FROM soportes
  ON CONFLICT (id_newsletter) DO UPDATE
  SET nombre_newsletter = EXCLUDED.nombre_newsletter,
      edicion = EXCLUDED.edicion,
      titulo = EXCLUDED.titulo,
      descripcion = EXCLUDED.descripcion,
      estado = EXCLUDED.estado,
      updated_at = NOW()
  RETURNING id_newsletter, nombre_newsletter, edicion
),
all_soportes AS (
  SELECT id_newsletter, nombre_newsletter, edicion
  FROM insert_soportes
  UNION
  SELECT
    'news_' || lower(regexp_replace(nombre_newsletter || '_' || edicion, '[^a-zA-Z0-9]+', '_', 'g')),
    nombre_newsletter,
    edicion
  FROM soportes
),
years AS (
  SELECT generate_series(2026, 2029) AS ano
),
slots AS (
  SELECT
    s.id_newsletter,
    s.nombre_newsletter,
    s.edicion,
    y.ano,
    gs.serial,
    CASE
      WHEN s.edicion ILIKE 'General%' AND y.ano = 2026 THEN (ARRAY[8,10,12])[gs.serial]
      WHEN s.edicion ILIKE 'General%' THEN (ARRAY[2,4,6,8,10,12])[gs.serial]
      WHEN y.ano = 2026 THEN (ARRAY[9,12])[gs.serial]
      ELSE (ARRAY[3,7,11])[gs.serial]
    END AS mes
  FROM all_soportes s
  CROSS JOIN years y
  CROSS JOIN LATERAL generate_series(
    1,
    CASE
      WHEN s.edicion ILIKE 'General%' AND y.ano = 2026 THEN 3
      WHEN s.edicion ILIKE 'General%' THEN 6
      WHEN y.ano = 2026 THEN 2
      ELSE 3
    END
  ) AS gs(serial)
),
fechas_newsletters AS (
  SELECT
    *,
    make_date(ano, mes, 20) AS fecha_publicacion_date
  FROM slots
)
INSERT INTO publicaciones_db (
  id_publicacion,
  nombre_publicacion,
  fecha_publicacion,
  estado_publicacion,
  medio_publicacion,
  edicion_publicacion,
  detalle_publicacion,
  tipo_publicacion,
  newsletter_id,
  numero_publicacion,
  deadline_materiales,
  link
)
SELECT
  'pub_' || id_newsletter || '_' || ano || '_' || serial,
  nombre_newsletter || ' ' || edicion || ' ' || ano || '-' || serial,
  to_char(fecha_publicacion_date, 'DD/MM/YYYY'),
  'Pendiente',
  'newsletter',
  edicion,
  nombre_newsletter,
  'newsletter',
  id_newsletter,
  ano || '-' || serial,
  to_char(fecha_publicacion_date - INTERVAL '21 days', 'DD/MM/YYYY'),
  ''
FROM fechas_newsletters
ON CONFLICT (id_publicacion) DO UPDATE
SET nombre_publicacion = EXCLUDED.nombre_publicacion,
    fecha_publicacion = EXCLUDED.fecha_publicacion,
    estado_publicacion = EXCLUDED.estado_publicacion,
    medio_publicacion = EXCLUDED.medio_publicacion,
    edicion_publicacion = EXCLUDED.edicion_publicacion,
    detalle_publicacion = EXCLUDED.detalle_publicacion,
    tipo_publicacion = EXCLUDED.tipo_publicacion,
    newsletter_id = EXCLUDED.newsletter_id,
    numero_publicacion = EXCLUDED.numero_publicacion,
    deadline_materiales = EXCLUDED.deadline_materiales,
    updated_at = NOW();

COMMIT;
