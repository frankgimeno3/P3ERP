BEGIN;

CREATE TABLE IF NOT EXISTS lineas_bancos (
  id_linea_banco TEXT PRIMARY KEY,
  banco TEXT NOT NULL,
  fecha_operativa TEXT NOT NULL DEFAULT '',
  fecha_valor TEXT NOT NULL DEFAULT '',
  concepto TEXT NOT NULL DEFAULT '',
  importe NUMERIC NOT NULL DEFAULT 0,
  saldo NUMERIC NOT NULL DEFAULT 0,
  estado_revision BOOLEAN NOT NULL DEFAULT FALSE,
  comentarios TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT lineas_bancos_banco_check CHECK (banco IN ('Sabadell', 'Santander')),
  CONSTRAINT lineas_bancos_id_check CHECK (id_linea_banco ~ '^(sab|san)_[0-9]{2}_[0-9]+$')
);

CREATE INDEX IF NOT EXISTS lineas_bancos_banco_idx ON lineas_bancos (banco);
CREATE INDEX IF NOT EXISTS lineas_bancos_fecha_operativa_idx ON lineas_bancos (fecha_operativa);
CREATE INDEX IF NOT EXISTS lineas_bancos_estado_revision_idx ON lineas_bancos (estado_revision);

COMMIT;
