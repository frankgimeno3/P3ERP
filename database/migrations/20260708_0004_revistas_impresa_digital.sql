BEGIN;

ALTER TABLE revistas_db
  ADD COLUMN IF NOT EXISTS impresa_o_digital TEXT NOT NULL DEFAULT 'digital';

ALTER TABLE publicaciones_db
  ADD COLUMN IF NOT EXISTS version_publicacion TEXT NOT NULL DEFAULT '';

UPDATE revistas_db
SET impresa_o_digital = 'digital',
    updated_at = NOW()
WHERE COALESCE(impresa_o_digital, '') = '';

UPDATE revistas_db
SET impresa_o_digital = 'impresa',
    updated_at = NOW()
WHERE revista = 'Quién es Quién';

UPDATE revistas_db
SET impresa_o_digital = 'digital',
    updated_at = NOW()
WHERE edicion = 'Iberia'
  AND revista <> 'Quién es Quién'
  AND id_revista NOT LIKE '%_impresa';

WITH iberia_digital AS (
  SELECT *
  FROM revistas_db
  WHERE edicion = 'Iberia'
    AND revista <> 'Quién es Quién'
    AND impresa_o_digital = 'digital'
    AND id_revista NOT LIKE '%_impresa'
)
INSERT INTO revistas_db (
  id_revista,
  edicion,
  revista,
  publicacion,
  deadline_materiales,
  fecha_publicacion,
  especial,
  impresa_o_digital,
  created_at,
  updated_at
)
SELECT
  id_revista || '_impresa',
  edicion,
  revista,
  publicacion,
  deadline_materiales,
  fecha_publicacion,
  especial,
  'impresa',
  NOW(),
  NOW()
FROM iberia_digital
ON CONFLICT (id_revista) DO UPDATE
SET edicion = EXCLUDED.edicion,
    revista = EXCLUDED.revista,
    especial = EXCLUDED.especial,
    impresa_o_digital = 'impresa',
    updated_at = NOW();

UPDATE publicaciones_db p
SET version_publicacion = r.impresa_o_digital,
    updated_at = NOW()
FROM revistas_db r
WHERE p.revista_id = r.id_revista
  AND p.tipo_publicacion = 'revista';

WITH iberia_publicaciones AS (
  SELECT
    p.*,
    r.id_revista AS id_revista_digital,
    r.id_revista || '_impresa' AS id_revista_impresa
  FROM publicaciones_db p
  JOIN revistas_db r ON r.id_revista = p.revista_id
  WHERE p.tipo_publicacion = 'revista'
    AND r.edicion = 'Iberia'
    AND r.revista <> 'Quién es Quién'
    AND r.impresa_o_digital = 'digital'
    AND r.id_revista NOT LIKE '%_impresa'
)
INSERT INTO publicaciones_db (
  id_publicacion,
  nombre_publicacion,
  tematica_edicion,
  deadline_material,
  fecha_publicacion,
  estado_publicacion,
  medio_publicacion,
  edicion_publicacion,
  detalle_publicacion,
  tipo_publicacion,
  revista_id,
  newsletter_id,
  numero_publicacion,
  version_publicacion,
  deadline_materiales,
  link,
  cuenta_id,
  contenido_id,
  created_at,
  updated_at
)
SELECT
  id_publicacion || '_impresa',
  nombre_publicacion || ' impresa',
  tematica_edicion,
  deadline_material,
  fecha_publicacion,
  estado_publicacion,
  medio_publicacion,
  edicion_publicacion,
  detalle_publicacion,
  tipo_publicacion,
  id_revista_impresa,
  newsletter_id,
  numero_publicacion,
  'impresa',
  deadline_materiales,
  link,
  cuenta_id,
  contenido_id,
  NOW(),
  NOW()
FROM iberia_publicaciones
ON CONFLICT (id_publicacion) DO UPDATE
SET revista_id = EXCLUDED.revista_id,
    numero_publicacion = EXCLUDED.numero_publicacion,
    version_publicacion = 'impresa',
    fecha_publicacion = EXCLUDED.fecha_publicacion,
    deadline_materiales = EXCLUDED.deadline_materiales,
    updated_at = NOW();

COMMIT;
