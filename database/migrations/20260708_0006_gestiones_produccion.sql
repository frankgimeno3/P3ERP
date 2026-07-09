BEGIN;

CREATE TABLE IF NOT EXISTS materiales_db (
  id_material TEXT PRIMARY KEY,
  nombre_material TEXT NOT NULL DEFAULT '',
  validacion_produccion TEXT NOT NULL DEFAULT 'pendiente validar',
  comentarios TEXT NOT NULL DEFAULT '',
  mediateca_id TEXT,
  archivo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS revistas_articulos (
  id_articulo_revista TEXT PRIMARY KEY,
  array_ids_publicaciones JSONB NOT NULL DEFAULT '[]'::jsonb,
  paginas_largo INTEGER NOT NULL DEFAULT 1,
  numero_version INTEGER NOT NULL DEFAULT 1,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  comentarios TEXT NOT NULL DEFAULT '',
  correcciones TEXT NOT NULL DEFAULT '',
  array_ids_materiales JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gestiones_produccion_db (
  id_gestion_prod TEXT PRIMARY KEY,
  nombre_gestion TEXT NOT NULL DEFAULT '',
  publicaciones_array JSONB NOT NULL DEFAULT '[]'::jsonb,
  articulos_array JSONB NOT NULL DEFAULT '[]'::jsonb,
  materiales_array JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gestiones_prod_listas (
  id_lista_gestiones_prod TEXT PRIMARY KEY,
  nombre_lista TEXT NOT NULL DEFAULT '',
  array_objetos_gestiones JSONB NOT NULL DEFAULT '[]'::jsonb,
  posicion_lista INTEGER NOT NULL UNIQUE CHECK (posicion_lista >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE contenidos_db
  ADD COLUMN IF NOT EXISTS id_gestion_prod TEXT,
  ADD COLUMN IF NOT EXISTS destinos_publicacion JSONB NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO gestiones_prod_listas (
  id_lista_gestiones_prod,
  nombre_lista,
  array_objetos_gestiones,
  posicion_lista
)
SELECT 'lista_gestiones_general', 'General', '[]'::jsonb, 0
WHERE NOT EXISTS (SELECT 1 FROM gestiones_prod_listas);

CREATE INDEX IF NOT EXISTS contenidos_id_gestion_prod_idx ON contenidos_db (id_gestion_prod);

COMMIT;
