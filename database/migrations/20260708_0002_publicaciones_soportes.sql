BEGIN;

CREATE TABLE IF NOT EXISTS newsleters_db (
  id_newsletter TEXT PRIMARY KEY,
  titulo TEXT NOT NULL DEFAULT '',
  descripcion TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'activo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO newsleters_db (id_newsletter, titulo, descripcion, estado, created_at, updated_at)
SELECT id_newsletter, COALESCE(titulo, ''), '', COALESCE(estado, 'activo'), created_at, updated_at
FROM newsletters_db
ON CONFLICT (id_newsletter) DO UPDATE
SET titulo = EXCLUDED.titulo,
    updated_at = NOW();

ALTER TABLE publicaciones_db
  ADD COLUMN IF NOT EXISTS tipo_publicacion TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS revista_id TEXT,
  ADD COLUMN IF NOT EXISTS newsletter_id TEXT,
  ADD COLUMN IF NOT EXISTS numero_publicacion TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS deadline_materiales TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS link TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cuenta_id TEXT,
  ADD COLUMN IF NOT EXISTS contenido_id TEXT;

CREATE INDEX IF NOT EXISTS publicaciones_db_tipo_publicacion_idx ON publicaciones_db (tipo_publicacion);
CREATE INDEX IF NOT EXISTS publicaciones_db_revista_id_idx ON publicaciones_db (revista_id);
CREATE INDEX IF NOT EXISTS publicaciones_db_newsletter_id_idx ON publicaciones_db (newsletter_id);
CREATE INDEX IF NOT EXISTS publicaciones_db_numero_publicacion_idx ON publicaciones_db (numero_publicacion);

INSERT INTO publicaciones_db (
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
  'Pendiente',
  'revista',
  COALESCE(r.edicion, ''),
  COALESCE(r.revista, ''),
  'revista',
  r.id_revista,
  COALESCE(r.publicacion, ''),
  COALESCE(r.deadline_materiales, '')
FROM revistas_db r
WHERE COALESCE(r.id_revista, '') <> ''
ON CONFLICT (id_publicacion) DO UPDATE
SET tipo_publicacion = EXCLUDED.tipo_publicacion,
    revista_id = EXCLUDED.revista_id,
    numero_publicacion = EXCLUDED.numero_publicacion,
    deadline_materiales = EXCLUDED.deadline_materiales,
    fecha_publicacion = EXCLUDED.fecha_publicacion,
    updated_at = NOW();

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
  'pub_' || n.id_newsletter,
  COALESCE(n.titulo, n.id_newsletter),
  COALESCE(n.fecha_publicacion, ''),
  COALESCE(n.estado, 'Pendiente'),
  'newsletter',
  '',
  COALESCE(n.titulo, ''),
  'newsletter',
  n.id_newsletter,
  COALESCE(NULLIF(regexp_replace(n.id_newsletter, '\D', '', 'g'), ''), '1'),
  COALESCE(n.deadline_materiales, ''),
  COALESCE(n.link, '')
FROM newsletters_db n
WHERE COALESCE(n.id_newsletter, '') <> ''
ON CONFLICT (id_publicacion) DO UPDATE
SET tipo_publicacion = EXCLUDED.tipo_publicacion,
    newsletter_id = EXCLUDED.newsletter_id,
    numero_publicacion = EXCLUDED.numero_publicacion,
    deadline_materiales = EXCLUDED.deadline_materiales,
    fecha_publicacion = EXCLUDED.fecha_publicacion,
    link = EXCLUDED.link,
    updated_at = NOW();

ALTER TABLE lineas_propuestas_db
  ADD COLUMN IF NOT EXISTS id_publicacion TEXT;

ALTER TABLE lineas_contratos_db
  ADD COLUMN IF NOT EXISTS id_publicacion TEXT;

CREATE INDEX IF NOT EXISTS lineas_propuestas_db_id_publicacion_idx ON lineas_propuestas_db (id_publicacion);
CREATE INDEX IF NOT EXISTS lineas_contratos_db_id_publicacion_idx ON lineas_contratos_db (id_publicacion);

COMMIT;
