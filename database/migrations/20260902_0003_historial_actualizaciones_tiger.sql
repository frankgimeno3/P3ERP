BEGIN;

CREATE TABLE IF NOT EXISTS historial_actualizaciones_tiger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tipo TEXT NOT NULL CHECK (tipo IN ('cuentas', 'contactos')),
  detalles TEXT NOT NULL,
  descripcion JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS historial_actualizaciones_tiger_tipo_fecha_idx
  ON historial_actualizaciones_tiger (tipo, fecha_hora DESC);

COMMIT;
