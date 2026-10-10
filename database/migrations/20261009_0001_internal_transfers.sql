-- One-off transfers between our own banks. No recurring charge is generated.
CREATE TABLE IF NOT EXISTS tesoreria_traspasos_propios (
  id text PRIMARY KEY,
  banco_origen text NOT NULL CHECK (banco_origen IN ('Sabadell','Santander')),
  banco_destino text NOT NULL CHECK (banco_destino IN ('Sabadell','Santander') AND banco_destino<>banco_origen),
  importe numeric(14,2) NOT NULL CHECK (importe>0),
  fecha date NOT NULL,
  estado text NOT NULL CHECK (estado IN ('previsto','revisado','pendiente_revision','cancelado')),
  prevision boolean NOT NULL DEFAULT false,
  id_linea_cargo text UNIQUE REFERENCES tesoreria_movimientos_bancarios(id_linea_banco) ON DELETE RESTRICT,
  id_linea_abono text UNIQUE REFERENCES tesoreria_movimientos_bancarios(id_linea_banco) ON DELETE RESTRICT,
  motivo text NOT NULL,
  actor text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (estado<>'revisado' OR id_linea_cargo IS NOT NULL OR id_linea_abono IS NOT NULL)
);
