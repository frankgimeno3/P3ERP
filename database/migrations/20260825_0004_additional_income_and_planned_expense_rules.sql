BEGIN;

CREATE TABLE IF NOT EXISTS ingresos_adicionales_db (
  id_ingreso_adicional TEXT PRIMARY KEY,
  id_cuenta TEXT,
  cliente_manual TEXT NOT NULL DEFAULT '',
  tipo_ingreso TEXT NOT NULL,
  asociado_factura BOOLEAN NOT NULL DEFAULT FALSE,
  numero_factura TEXT NOT NULL DEFAULT '',
  fecha_teorica TEXT NOT NULL,
  forma_cobro TEXT NOT NULL,
  banco TEXT NOT NULL,
  base_imponible NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ingresos_adicionales_tipo_check CHECK (tipo_ingreso IN ('recibo', 'transferencia')),
  CONSTRAINT ingresos_adicionales_banco_check CHECK (banco IN ('Sabadell', 'Santander')),
  CONSTRAINT ingresos_adicionales_cliente_check CHECK (COALESCE(id_cuenta, '') <> '' OR btrim(cliente_manual) <> ''),
  CONSTRAINT ingresos_adicionales_factura_check CHECK (NOT asociado_factura OR btrim(numero_factura) <> ''),
  CONSTRAINT ingresos_adicionales_base_check CHECK (base_imponible > 0)
);

CREATE INDEX IF NOT EXISTS ingresos_adicionales_fecha_idx ON ingresos_adicionales_db (fecha_teorica);
CREATE INDEX IF NOT EXISTS ingresos_adicionales_cuenta_idx ON ingresos_adicionales_db (id_cuenta);

UPDATE pagos_db
SET forma_pago = CASE
  WHEN forma_pago ILIKE '%transf%' THEN 'transferencia'
  WHEN forma_pago ILIKE '%pagar%' THEN 'pagaré'
  ELSE 'recibo'
END
WHERE COALESCE(forma_pago, '') <> '';

UPDATE pagos_db
SET cuenta_pago = CASE WHEN cuenta_pago ILIKE '%santander%' THEN 'Santander' ELSE 'Sabadell' END
WHERE COALESCE(cuenta_pago, '') <> '';

ALTER TABLE pagos_db DROP CONSTRAINT IF EXISTS pagos_db_forma_pago_check;
ALTER TABLE pagos_db ADD CONSTRAINT pagos_db_forma_pago_check
  CHECK (forma_pago IS NULL OR forma_pago = '' OR forma_pago IN ('recibo', 'transferencia', 'pagaré'));
ALTER TABLE pagos_db DROP CONSTRAINT IF EXISTS pagos_db_cuenta_pago_check;
ALTER TABLE pagos_db ADD CONSTRAINT pagos_db_cuenta_pago_check
  CHECK (cuenta_pago IS NULL OR cuenta_pago = '' OR cuenta_pago IN ('Sabadell', 'Santander'));

COMMIT;
