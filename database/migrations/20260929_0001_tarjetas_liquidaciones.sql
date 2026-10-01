BEGIN;
ALTER TABLE tesoreria_tarjetas
  ADD COLUMN IF NOT EXISTS codigo text,
  ADD COLUMN IF NOT EXISTS descripcion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS periodicidad_meses integer NOT NULL DEFAULT 1 CHECK (periodicidad_meses BETWEEN 1 AND 12),
  ADD COLUMN IF NOT EXISTS inicio_periodo date,
  ADD COLUMN IF NOT EXISTS proximo_cierre date,
  ADD COLUMN IF NOT EXISTS proxima_liquidacion date,
  ADD COLUMN IF NOT EXISTS dia_cierre integer CHECK (dia_cierre BETWEEN 1 AND 31),
  ADD COLUMN IF NOT EXISTS dia_liquidacion integer CHECK (dia_liquidacion BETWEEN 1 AND 31);
UPDATE tesoreria_tarjetas SET codigo=id_tarjeta WHERE codigo IS NULL;
ALTER TABLE tesoreria_tarjetas ALTER COLUMN codigo SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tarjetas_codigo_idx ON tesoreria_tarjetas(lower(btrim(codigo)));
ALTER TABLE tesoreria_cargos_recurrentes ADD COLUMN IF NOT EXISTS id_tarjeta text REFERENCES tesoreria_tarjetas(id_tarjeta);
ALTER TABLE administracion_tickets ADD COLUMN IF NOT EXISTS id_vencimiento_tarjeta text REFERENCES tesoreria_cargos_vencimientos(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ticket_vencimiento_tarjeta_idx ON administracion_tickets(id_vencimiento_tarjeta) WHERE id_vencimiento_tarjeta IS NOT NULL;
CREATE TABLE IF NOT EXISTS tesoreria_tarjetas_liquidaciones (
  id text PRIMARY KEY,
  id_tarjeta text NOT NULL REFERENCES tesoreria_tarjetas(id_tarjeta),
  inicio date NOT NULL,
  cierre date NOT NULL,
  fecha date NOT NULL,
  previsto numeric(14,2) NOT NULL,
  real numeric(14,2) NOT NULL,
  detalle jsonb NOT NULL,
  comentario text NOT NULL DEFAULT '',
  actor text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'revisada' CHECK (estado IN ('revisada','anulada')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS tarjeta_liquidacion_periodo_idx ON tesoreria_tarjetas_liquidaciones(id_tarjeta,cierre) WHERE estado='revisada';
CREATE TABLE IF NOT EXISTS tesoreria_tarjetas_movimientos (
  id_linea_banco text PRIMARY KEY REFERENCES tesoreria_movimientos_bancarios(id_linea_banco),
  id_liquidacion text NOT NULL REFERENCES tesoreria_tarjetas_liquidaciones(id)
);
CREATE INDEX IF NOT EXISTS tarjeta_liquidacion_movimientos_idx ON tesoreria_tarjetas_movimientos(id_liquidacion);
COMMIT;
