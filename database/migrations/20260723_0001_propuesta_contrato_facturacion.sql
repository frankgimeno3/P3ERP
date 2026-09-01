BEGIN;

ALTER TABLE contratos_db
  ADD COLUMN IF NOT EXISTS nombre_contrato TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS comentarios_adicionales TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS datos_facturacion JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS propuesta_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS id_factura TEXT;

ALTER TABLE lineas_contratos_db
  ADD COLUMN IF NOT EXISTS id_linea_propuesta TEXT,
  ADD COLUMN IF NOT EXISTS id_servicio TEXT,
  ADD COLUMN IF NOT EXISTS id_publicacion TEXT,
  ADD COLUMN IF NOT EXISTS precio_tarifa NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS descuento_producto NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tipo_descuento_producto TEXT NOT NULL DEFAULT 'porcentaje',
  ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unidades NUMERIC NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS descripcion_linea TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS especificaciones_linea TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS modo_precio TEXT NOT NULL DEFAULT 'calculado',
  ADD COLUMN IF NOT EXISTS precio_total_personalizado NUMERIC,
  ADD COLUMN IF NOT EXISTS id_pagina_publicacion TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS linea_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE contenidos_db
  ADD COLUMN IF NOT EXISTS id_contrato TEXT,
  ADD COLUMN IF NOT EXISTS id_linea_contrato TEXT,
  ADD COLUMN IF NOT EXISTS nombre_contenido TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo_contenido TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_publicacion TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS ano_publicacion TEXT NOT NULL DEFAULT '';

ALTER TABLE gestiones_produccion_db
  ADD COLUMN IF NOT EXISTS id_contrato TEXT,
  ADD COLUMN IF NOT EXISTS id_contenido TEXT,
  ADD COLUMN IF NOT EXISTS id_lista_gestiones_prod TEXT;

ALTER TABLE tareas_db ADD COLUMN IF NOT EXISTS contrato_id TEXT;

CREATE TABLE IF NOT EXISTS cobros_contratos_db (
  id_cobro_contrato TEXT PRIMARY KEY,
  id_contrato TEXT NOT NULL,
  id_cobro_propuesta TEXT,
  numero_cobro INTEGER,
  fecha_cobro TEXT,
  importe_cobro NUMERIC,
  forma_cobro TEXT,
  banco_cobro TEXT,
  observaciones_cobro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE facturas_clientes_db
  ADD COLUMN IF NOT EXISTS id_contrato TEXT,
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'en proceso',
  ADD COLUMN IF NOT EXISTS ya_contabilizada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS numero_factura TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS datos_fiscales JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS datos_verifactu JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fecha_emision DATE,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE,
  ADD COLUMN IF NOT EXISTS iva_porcentaje NUMERIC NOT NULL DEFAULT 21,
  ADD COLUMN IF NOT EXISTS factura_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS lineas_facturas_db (
  id_linea_factura TEXT PRIMARY KEY,
  id_factura_cliente TEXT NOT NULL,
  id_linea_contrato TEXT,
  posicion INTEGER NOT NULL,
  concepto TEXT NOT NULL DEFAULT '',
  descripcion TEXT NOT NULL DEFAULT '',
  cantidad NUMERIC NOT NULL DEFAULT 1,
  precio_unitario NUMERIC NOT NULL DEFAULT 0,
  descuento NUMERIC NOT NULL DEFAULT 0,
  tipo_descuento TEXT NOT NULL DEFAULT 'porcentaje',
  base_imponible NUMERIC NOT NULL DEFAULT 0,
  iva_porcentaje NUMERIC NOT NULL DEFAULT 21,
  importe_total NUMERIC NOT NULL DEFAULT 0,
  personalizada BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (id_factura_cliente, posicion)
);

ALTER TABLE ordenes_db
  ADD COLUMN IF NOT EXISTS id_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS cobrada BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS contratos_db_id_factura_idx ON contratos_db(id_factura);
CREATE INDEX IF NOT EXISTS lineas_contratos_db_id_contrato_idx ON lineas_contratos_db(id_contrato);
CREATE INDEX IF NOT EXISTS contenidos_db_id_contrato_idx ON contenidos_db(id_contrato);
CREATE INDEX IF NOT EXISTS cobros_contratos_db_id_contrato_idx ON cobros_contratos_db(id_contrato);
CREATE INDEX IF NOT EXISTS facturas_clientes_db_estado_idx ON facturas_clientes_db(estado);
CREATE INDEX IF NOT EXISTS lineas_facturas_db_factura_idx ON lineas_facturas_db(id_factura_cliente);
CREATE INDEX IF NOT EXISTS ordenes_db_id_factura_idx ON ordenes_db(id_factura);

COMMIT;
