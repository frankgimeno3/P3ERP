BEGIN;

CREATE TABLE IF NOT EXISTS newsletters_db (
  id_newsletter text PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  titulo text NOT NULL DEFAULT '',
  cuenta_id text,
  contenido_id text,
  link text NOT NULL DEFAULT '',
  deadline_materiales text NOT NULL DEFAULT '',
  fecha_publicacion text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS newsletters_db_cuenta_id_idx ON newsletters_db (cuenta_id);
CREATE INDEX IF NOT EXISTS newsletters_db_contenido_id_idx ON newsletters_db (contenido_id);
CREATE INDEX IF NOT EXISTS newsletters_db_fecha_publicacion_idx ON newsletters_db (fecha_publicacion);

INSERT INTO newsletters_db (
  id_newsletter,
  titulo,
  cuenta_id,
  contenido_id,
  link,
  deadline_materiales,
  fecha_publicacion,
  estado
)
SELECT
  c.id_contenido,
  coalesce(nullif(c.especificaciones_contenido, ''), c.id_contenido),
  c.id_cuenta,
  c.id_contenido,
  coalesce(c.url_contenido, ''),
  coalesce(c.deadline_publicacion, c.deadline_contenido, ''),
  coalesce(c.fecha_publicacion_publicacion, ''),
  coalesce(c.estado_contenido, '')
FROM contenidos_db c
WHERE lower(coalesce(c.medio, '')) = 'newsletter'
ON CONFLICT (id_newsletter) DO UPDATE
SET titulo = EXCLUDED.titulo,
    cuenta_id = EXCLUDED.cuenta_id,
    contenido_id = EXCLUDED.contenido_id,
    link = EXCLUDED.link,
    deadline_materiales = EXCLUDED.deadline_materiales,
    fecha_publicacion = EXCLUDED.fecha_publicacion,
    estado = EXCLUDED.estado,
    updated_at = now();

CREATE TABLE IF NOT EXISTS contenidos_revistas_db (
  contenido_revista_id text PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  revista_id text NOT NULL REFERENCES revistas_db(id_revista) ON DELETE CASCADE,
  contenido_id text NOT NULL REFERENCES contenidos_db(id_contenido) ON DELETE CASCADE,
  numero_pagina integer NOT NULL DEFAULT -1 CHECK (numero_pagina >= -1),
  tipo_pagina text NOT NULL DEFAULT '',
  pagina_del_contenido integer NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS contenidos_revistas_db_revista_id_idx ON contenidos_revistas_db (revista_id);
CREATE INDEX IF NOT EXISTS contenidos_revistas_db_contenido_id_idx ON contenidos_revistas_db (contenido_id);

ALTER TABLE contenidos_db ADD COLUMN IF NOT EXISTS contenido_especifico_id text;
ALTER TABLE contenidos_db ADD COLUMN IF NOT EXISTS servicio text;

UPDATE contenidos_db
SET contenido_especifico_id = coalesce(nullif(contenido_especifico_id, ''), nullif(id_publicacion, ''), nullif(publicacion, '')),
    servicio = coalesce(nullif(servicio, ''), nullif(producto, ''))
WHERE contenido_especifico_id IS NULL
   OR contenido_especifico_id = ''
   OR servicio IS NULL
   OR servicio = '';

ALTER TABLE contenidos_db DROP COLUMN IF EXISTS publicacion;
ALTER TABLE contenidos_db DROP COLUMN IF EXISTS producto;
ALTER TABLE contenidos_db DROP COLUMN IF EXISTS fecha_publicacion_publicacion;

ALTER TABLE ferias_db ADD COLUMN IF NOT EXISTS id_revista_especial text NOT NULL DEFAULT '';
ALTER TABLE ferias_db ADD COLUMN IF NOT EXISTS id_propuesta_intercambio text NOT NULL DEFAULT '';
ALTER TABLE ferias_db ADD COLUMN IF NOT EXISTS estado_intercambio text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS contenidos_db_contenido_especifico_id_idx ON contenidos_db (contenido_especifico_id);
CREATE INDEX IF NOT EXISTS contenidos_db_servicio_idx ON contenidos_db (servicio);

COMMIT;
