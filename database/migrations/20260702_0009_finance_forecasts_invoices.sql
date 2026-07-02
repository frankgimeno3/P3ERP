BEGIN;

ALTER TABLE ordenes_db
  ADD COLUMN IF NOT EXISTS numero_cobro integer,
  ADD COLUMN IF NOT EXISTS etiqueta_cobro text,
  ADD COLUMN IF NOT EXISTS fecha_teorica_cobro text,
  ADD COLUMN IF NOT EXISTS fecha_real_cobro text,
  ADD COLUMN IF NOT EXISTS forma_cobro text,
  ADD COLUMN IF NOT EXISTS banco_cobro text,
  ADD COLUMN IF NOT EXISTS base_imponible numeric,
  ADD COLUMN IF NOT EXISTS cobro_total numeric;

UPDATE ordenes_db o
SET
  forma_cobro = COALESCE(NULLIF(o.forma_cobro, ''), NULLIF(o.tipo_cobro, ''), c.forma_cobro_contrato),
  fecha_teorica_cobro = COALESCE(NULLIF(o.fecha_teorica_cobro, ''), c.fecha_cobro_prevista_contrato),
  base_imponible = COALESCE(o.base_imponible, c.importe_total_bi_contrato),
  cobro_total = COALESCE(o.cobro_total, c.importe_contrato_con_iva),
  updated_at = now()
FROM contratos_db c
WHERE c.id_contrato = o.id_contrato;

UPDATE ordenes_db
SET
  numero_cobro = COALESCE(numero_cobro, 1),
  etiqueta_cobro = COALESCE(NULLIF(etiqueta_cobro, ''), 'Cobro 1'),
  banco_cobro = COALESCE(NULLIF(banco_cobro, ''), 'Sabadell'),
  updated_at = now();

ALTER TABLE ordenes_db
  DROP COLUMN IF EXISTS tipo_cobro;

ALTER TABLE ordenes_db
  DROP CONSTRAINT IF EXISTS ordenes_db_banco_cobro_check,
  ADD CONSTRAINT ordenes_db_banco_cobro_check
    CHECK (banco_cobro IS NULL OR banco_cobro = '' OR banco_cobro IN ('Sabadell', 'Santander'));

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pagos_db'
      AND column_name = 'id_pagos'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pagos_db'
      AND column_name = 'id_pago'
  ) THEN
    ALTER TABLE pagos_db RENAME COLUMN id_pagos TO id_pago;
  END IF;
END $$;

ALTER TABLE pagos_db
  ADD COLUMN IF NOT EXISTS fecha_pago text,
  ADD COLUMN IF NOT EXISTS bi_pago numeric,
  ADD COLUMN IF NOT EXISTS total_pago numeric,
  ADD COLUMN IF NOT EXISTS forma_pago text,
  ADD COLUMN IF NOT EXISTS cuenta_pago text,
  ADD COLUMN IF NOT EXISTS id_proveedor text,
  ADD COLUMN IF NOT EXISTS nombre_planificacion text,
  ADD COLUMN IF NOT EXISTS descripcion_planificacion text;

ALTER TABLE proveedores_db
  ADD COLUMN IF NOT EXISTS nombre_proveedor text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nombre_fiscal_proveedor text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS vat_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pais_proveedor text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS moneda_proveedor text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS facturas_clientes_db (
  id_factura_cliente text PRIMARY KEY,
  id_cuenta text,
  base_imponible numeric,
  importe_total numeric,
  fecha_factura text,
  comentarios text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS facturas_proveedores_db (
  id_factura_proveedor text PRIMARY KEY,
  id_proveedor text,
  base_imponible numeric,
  importe_total numeric,
  fecha_factura text,
  comentarios text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO facturas_clientes_db (
  id_factura_cliente,
  id_cuenta,
  base_imponible,
  importe_total,
  fecha_factura,
  comentarios
)
SELECT DISTINCT
  o.id_factura,
  c.id_cuenta_contrato,
  o.base_imponible,
  o.cobro_total,
  o.fecha_real_cobro,
  'Factura creada desde orden ' || o.id_orden
FROM ordenes_db o
LEFT JOIN contratos_db c ON c.id_contrato = o.id_contrato
WHERE o.id_factura IS NOT NULL AND o.id_factura <> ''
ON CONFLICT (id_factura_cliente) DO UPDATE
SET
  id_cuenta = EXCLUDED.id_cuenta,
  base_imponible = EXCLUDED.base_imponible,
  importe_total = EXCLUDED.importe_total,
  updated_at = now();

CREATE INDEX IF NOT EXISTS ordenes_db_forma_cobro_idx ON ordenes_db (forma_cobro);
CREATE INDEX IF NOT EXISTS ordenes_db_fecha_teorica_cobro_idx ON ordenes_db (fecha_teorica_cobro);
CREATE INDEX IF NOT EXISTS facturas_clientes_db_id_cuenta_idx ON facturas_clientes_db (id_cuenta);
CREATE INDEX IF NOT EXISTS facturas_proveedores_db_id_proveedor_idx ON facturas_proveedores_db (id_proveedor);
CREATE INDEX IF NOT EXISTS pagos_db_id_proveedor_idx ON pagos_db (id_proveedor);

DROP TABLE IF EXISTS cobros;

COMMIT;
