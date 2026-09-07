ALTER TABLE lineas_bancos
  ADD COLUMN IF NOT EXISTS id_cuenta TEXT REFERENCES cuentas_db(id_cuenta) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_orden TEXT REFERENCES ordenes_db(id_orden) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS id_pago TEXT REFERENCES pagos_db(id_pago) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS lineas_bancos_id_cuenta_idx ON lineas_bancos (id_cuenta);
CREATE INDEX IF NOT EXISTS lineas_bancos_id_orden_idx ON lineas_bancos (id_orden);
CREATE INDEX IF NOT EXISTS lineas_bancos_id_pago_idx ON lineas_bancos (id_pago);

CREATE TABLE IF NOT EXISTS cargos_recurrentes (
  id_cargo_recurrente BIGSERIAL PRIMARY KEY,
  id_proveedor TEXT NOT NULL REFERENCES proveedores_db(id_proveedor),
  tipo_programacion TEXT NOT NULL CHECK (tipo_programacion IN ('fechas', 'periodicidad')),
  programacion JSONB NOT NULL DEFAULT '[]'::jsonb,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE lineas_bancos
  ADD COLUMN IF NOT EXISTS id_cargo_recurrente BIGINT REFERENCES cargos_recurrentes(id_cargo_recurrente) ON DELETE SET NULL;
