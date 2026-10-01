ALTER TABLE comercial_contratos
 ADD COLUMN IF NOT EXISTS datos_importacion jsonb NOT NULL DEFAULT '{}'::jsonb,
 ADD COLUMN IF NOT EXISTS es_intercambio boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS importe_intercambio numeric NOT NULL DEFAULT 0;
ALTER TABLE produccion_contenidos ADD COLUMN IF NOT EXISTS datos_importacion jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE administracion_facturas_clientes ADD COLUMN IF NOT EXISTS datos_importacion jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE comercial_contratos_lineas ADD COLUMN IF NOT EXISTS precio_no_desglosado boolean NOT NULL DEFAULT false;
ALTER TABLE administracion_lineas_factura ADD COLUMN IF NOT EXISTS precio_no_desglosado boolean NOT NULL DEFAULT false;
