CREATE TABLE IF NOT EXISTS proveedores_benchmark (
  id TEXT PRIMARY KEY,
  id_proveedor TEXT NOT NULL REFERENCES proveedores_db(id_proveedor),
  servicio TEXT NOT NULL CHECK (length(btrim(servicio)) > 0),
  descripcion TEXT NOT NULL DEFAULT '',
  unidad TEXT NOT NULL CHECK (length(btrim(unidad)) > 0),
  precio_por_unidad NUMERIC(12,2) NOT NULL CHECK (precio_por_unidad >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS proveedores_benchmark_proveedor_idx ON proveedores_benchmark(id_proveedor);
