CREATE TABLE IF NOT EXISTS horas_juan (
  id_horas_juan BIGSERIAL PRIMARY KEY,
  mes SMALLINT NOT NULL CHECK (mes BETWEEN 1 AND 12),
  anio SMALLINT NOT NULL CHECK (anio BETWEEN 2000 AND 2100),
  nombre VARCHAR(160) NOT NULL DEFAULT 'Juan',
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('normal', 'informativa', 'anticipo')),
  horas NUMERIC(8, 2),
  horas_enteras INTEGER,
  minutos SMALLINT CHECK (minutos BETWEEN 0 AND 59),
  precio_hora NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
  importe_generado NUMERIC(12, 2),
  importe_anticipo NUMERIC(12, 2),
  importe_ajuste NUMERIC(12, 2) NOT NULL DEFAULT 0,
  importe_pagar NUMERIC(12, 2),
  saldo_pendiente NUMERIC(12, 2) NOT NULL DEFAULT 0,
  fecha DATE NOT NULL,
  compensado_en_id BIGINT REFERENCES horas_juan(id_horas_juan) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((tipo = 'anticipo' AND horas IS NULL AND importe_anticipo IS NOT NULL AND importe_pagar IS NOT NULL)
    OR (tipo = 'informativa' AND horas IS NOT NULL AND importe_generado IS NOT NULL AND importe_anticipo IS NOT NULL AND importe_pagar IS NULL)
    OR (tipo = 'normal' AND horas IS NOT NULL AND importe_generado IS NOT NULL AND importe_pagar IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS horas_juan_cierre_unico ON horas_juan (nombre, anio, mes, tipo) WHERE tipo IN ('normal', 'informativa');
CREATE INDEX IF NOT EXISTS horas_juan_periodo_idx ON horas_juan (anio DESC, mes DESC, created_at DESC);
UPDATE roles_db SET permisos_rol = CASE WHEN permisos_rol @> '["/dashboard/direccion/horas-juan"]'::jsonb THEN permisos_rol ELSE permisos_rol || '["/dashboard/direccion/horas-juan"]'::jsonb END, updated_at = NOW() WHERE id_rol = 'superadmin';
