CREATE TABLE IF NOT EXISTS registro_copias_seguridad (
  id_copia_seguridad BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  detalles TEXT NOT NULL DEFAULT '',
  estado VARCHAR(20) NOT NULL DEFAULT 'correcta'
    CHECK (estado IN ('correcta', 'error')),
  tablas JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_registro_copias_seguridad_fecha
  ON registro_copias_seguridad (fecha DESC);
