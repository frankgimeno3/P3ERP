-- Migration: Add GM tickets table and cargos pendientes

BEGIN;

-- Create table for cargos pendientes (pending charges from invoices)
CREATE TABLE IF NOT EXISTS cargos_pendientes_db (
  id_cargo_pendiente TEXT PRIMARY KEY,
  id_factura_proveedor TEXT NOT NULL REFERENCES facturas_proveedores_db(id_factura_proveedor) ON DELETE CASCADE,
  id_proveedor TEXT NOT NULL REFERENCES proveedores_db(id_proveedor) ON DELETE CASCADE,
  concepto TEXT NOT NULL CHECK (length(btrim(concepto)) > 0),
  importe_cargo NUMERIC(12,2) NOT NULL CHECK (importe_cargo > 0),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','pagado','anulado')),
  fecha_cargo TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_pago_prevista TIMESTAMPTZ,
  comentarios TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cargos_pendientes_factura_idx ON cargos_pendientes_db(id_factura_proveedor);
CREATE INDEX IF NOT EXISTS cargos_pendientes_proveedor_idx ON cargos_pendientes_db(id_proveedor);
CREATE INDEX IF NOT EXISTS cargos_pendientes_estado_idx ON cargos_pendientes_db(estado);

-- Create table for GM tickets (simpler structure than P3)
CREATE TABLE IF NOT EXISTS tickets_gm_db (
  id_ticket_gm TEXT PRIMARY KEY,
  fecha_ticket TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  id_proveedor TEXT REFERENCES proveedores_db(id_proveedor) ON DELETE SET NULL,
  nombre_personalizado_proveedor TEXT NOT NULL DEFAULT '',
  importe NUMERIC(12,2) NOT NULL CHECK (importe > 0),
  forma_pago TEXT NOT NULL CHECK (forma_pago IN ('efectivo','tarjeta')),
  id_tarjeta TEXT REFERENCES tarjetas(id_tarjeta) ON DELETE SET NULL,
  tarjeta_ultimos_digitos TEXT NOT NULL DEFAULT '',
  tarjeta_banco TEXT NOT NULL DEFAULT '',
  archivo_nombre TEXT NOT NULL DEFAULT '',
  archivo_tipo TEXT NOT NULL DEFAULT '',
  archivo_contenido BYTEA,
  comentarios TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tickets_gm_proveedor_check CHECK (
    (id_proveedor IS NOT NULL AND nombre_personalizado_proveedor = '')
    OR (id_proveedor IS NULL AND nombre_personalizado_proveedor <> '')
  ),
  CONSTRAINT tickets_gm_forma_pago_check CHECK (
    (forma_pago = 'efectivo' AND id_tarjeta IS NULL AND tarjeta_ultimos_digitos = '')
    OR (forma_pago = 'tarjeta' AND id_tarjeta IS NOT NULL AND tarjeta_ultimos_digitos <> '')
  )
);

CREATE INDEX IF NOT EXISTS tickets_gm_proveedor_idx ON tickets_gm_db(id_proveedor);
CREATE INDEX IF NOT EXISTS tickets_gm_tarjeta_idx ON tickets_gm_db(id_tarjeta);
CREATE INDEX IF NOT EXISTS tickets_gm_fecha_idx ON tickets_gm_db(fecha_ticket DESC);

-- Ensure tickets_db has all necessary constraints
ALTER TABLE tickets_db 
  ADD CONSTRAINT tickets_db_forma_pago_check CHECK (
    forma_pago IN ('efectivo','tarjeta')
  );

ALTER TABLE tickets_db
  ADD CONSTRAINT tickets_db_tarjeta_form_pago_check CHECK (
    (forma_pago = 'efectivo' AND id_tarjeta IS NULL AND tarjeta_ultimos_digitos = '')
    OR (forma_pago = 'tarjeta' AND id_tarjeta IS NOT NULL AND tarjeta_ultimos_digitos <> '')
  );

COMMIT;
