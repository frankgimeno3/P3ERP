BEGIN;

ALTER TABLE facturas_proveedores_db
  ADD COLUMN IF NOT EXISTS numero_factura_proveedor text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS documento_src text NOT NULL DEFAULT '';

ALTER TABLE pagos_db
  ADD COLUMN IF NOT EXISTS id_factura_proveedor text,
  ADD COLUMN IF NOT EXISTS comentarios text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS pagos_db_factura_proveedor_idx ON pagos_db (id_factura_proveedor);

CREATE TABLE IF NOT EXISTS tickets_db (
  id_ticket bigserial PRIMARY KEY,
  fecha_ticket text NOT NULL,
  id_proveedor text,
  nombre_personalizado_proveedor text NOT NULL DEFAULT '',
  base_imponible numeric NOT NULL,
  importe_total numeric NOT NULL,
  forma_pago text NOT NULL,
  documento_src text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tickets_db_proveedor_check CHECK (
    (id_proveedor IS NOT NULL AND nombre_personalizado_proveedor = '')
    OR (id_proveedor IS NULL AND nombre_personalizado_proveedor <> '')
  )
);
CREATE INDEX IF NOT EXISTS tickets_db_id_proveedor_idx ON tickets_db (id_proveedor);

COMMIT;
