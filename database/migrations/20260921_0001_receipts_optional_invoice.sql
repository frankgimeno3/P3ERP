-- A planned receipt may exist before its order is invoiced.
ALTER TABLE tesoreria_recibos_importados ALTER COLUMN numero_factura DROP NOT NULL;
