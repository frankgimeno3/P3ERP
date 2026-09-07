CREATE TABLE IF NOT EXISTS proveedores_unificados (
  id_anterior TEXT PRIMARY KEY,
  id_proveedor TEXT NOT NULL,
  datos_anteriores JSONB NOT NULL,
  datos_destino_anteriores JSONB NOT NULL,
  referencias_anteriores JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS proveedores_unificados_destino_idx ON proveedores_unificados(id_proveedor);

CREATE TABLE IF NOT EXISTS tarjetas (
  id_tarjeta TEXT PRIMARY KEY,
  ultimos_digitos TEXT NOT NULL CHECK (ultimos_digitos ~ '^[0-9]{4}$'),
  nombre TEXT NOT NULL CHECK (length(btrim(nombre)) > 0),
  banco TEXT NOT NULL CHECK (length(btrim(banco)) > 0),
  tipo TEXT NOT NULL CHECK (tipo IN ('p3','personal')),
  estado TEXT NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','obsoleta')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS tarjetas_identidad_idx ON tarjetas(lower(btrim(banco)),ultimos_digitos,tipo);

ALTER TABLE tickets_db
  ADD COLUMN IF NOT EXISTS ambito TEXT NOT NULL DEFAULT 'P3' CHECK (ambito IN ('P3','GM')),
  ADD COLUMN IF NOT EXISTS id_tarjeta TEXT REFERENCES tarjetas(id_tarjeta) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tarjeta_ultimos_digitos TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tarjeta_banco TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tarjeta_nombre TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tarjeta_tipo TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS archivo_nombre TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS archivo_tipo TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS archivo_contenido BYTEA;
ALTER TABLE tickets_db ALTER COLUMN base_imponible DROP NOT NULL;
CREATE INDEX IF NOT EXISTS tickets_db_ambito_idx ON tickets_db(ambito);
CREATE INDEX IF NOT EXISTS tickets_db_tarjeta_idx ON tickets_db(id_tarjeta);

CREATE TABLE IF NOT EXISTS precios_proveedores (
  id_precio TEXT PRIMARY KEY,
  id_proveedor TEXT NOT NULL REFERENCES proveedores_db(id_proveedor),
  concepto TEXT NOT NULL CHECK (length(btrim(concepto)) > 0),
  importe NUMERIC(12,2) NOT NULL CHECK (importe >= 0),
  moneda TEXT NOT NULL DEFAULT 'EUR',
  fecha DATE NOT NULL,
  comentarios TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS precios_proveedores_proveedor_idx ON precios_proveedores(id_proveedor,fecha);
