ALTER TABLE propuestas_db
  ADD COLUMN IF NOT EXISTS fase_propuesta text NOT NULL DEFAULT '1',
  ADD COLUMN IF NOT EXISTS fecha_validez_propuesta text,
  ADD COLUMN IF NOT EXISTS datos_facturacion jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS contacto_personalizado jsonb;

ALTER TABLE lineas_propuestas_db
  ADD COLUMN IF NOT EXISTS id_servicio text,
  ADD COLUMN IF NOT EXISTS unidades numeric DEFAULT 1,
  ADD COLUMN IF NOT EXISTS descripcion_linea text;

CREATE TABLE IF NOT EXISTS cobros_propuestas_db (
  id_cobro_propuesta text PRIMARY KEY,
  id_propuesta text,
  numero_cobro integer,
  fecha_cobro text,
  importe_cobro numeric,
  forma_cobro text,
  banco_cobro text,
  observaciones_cobro text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS propuestas_db_estado_idx ON propuestas_db (estado_propuesta);
CREATE INDEX IF NOT EXISTS propuestas_db_fase_idx ON propuestas_db (fase_propuesta);
CREATE INDEX IF NOT EXISTS propuestas_db_id_cuenta_idx ON propuestas_db (id_cuenta_propuesta);
CREATE INDEX IF NOT EXISTS cobros_propuestas_db_id_propuesta_idx ON cobros_propuestas_db (id_propuesta);
