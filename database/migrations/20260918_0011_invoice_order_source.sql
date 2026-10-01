ALTER TABLE administracion_facturas_clientes ADD COLUMN IF NOT EXISTS id_orden_origen TEXT;
COMMENT ON COLUMN administracion_facturas_clientes.id_orden_origen IS 'Orden concreta que originó esta factura previa cuando se factura por orden.';
CREATE INDEX IF NOT EXISTS idx_facturas_clientes_orden_origen ON administracion_facturas_clientes(id_orden_origen) WHERE id_orden_origen IS NOT NULL;
