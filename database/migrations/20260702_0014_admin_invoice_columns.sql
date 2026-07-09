BEGIN;

ALTER TABLE facturas_clientes_db
  ADD COLUMN IF NOT EXISTS total_nac_iva numeric,
  ADD COLUMN IF NOT EXISTS total_ue numeric,
  ADD COLUMN IF NOT EXISTS total_resto numeric,
  ADD COLUMN IF NOT EXISTS forma_cobro text;

UPDATE facturas_clientes_db
SET total_nac_iva = COALESCE(total_nac_iva, importe_total),
    forma_cobro = COALESCE(NULLIF(forma_cobro, ''), ''),
    updated_at = now();

ALTER TABLE facturas_proveedores_db
  ADD COLUMN IF NOT EXISTS orden_compra_p3 text,
  ADD COLUMN IF NOT EXISTS numero_contabilidad text,
  ADD COLUMN IF NOT EXISTS codigo_factura text,
  ADD COLUMN IF NOT EXISTS forma_pago text,
  ADD COLUMN IF NOT EXISTS estado text;

UPDATE facturas_proveedores_db
SET codigo_factura = COALESCE(NULLIF(codigo_factura, ''), id_factura_proveedor),
    estado = COALESCE(NULLIF(estado, ''), 'pendiente'),
    updated_at = now();

COMMIT;
