-- Source workbook is retained independently of bank transactions and invoices.
CREATE TABLE IF NOT EXISTS tesoreria_prevision_juan (
  id text PRIMARY KEY,
  source_name text NOT NULL,
  sheets jsonb NOT NULL,
  original_sheets jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS tesoreria_prevision_juan_enlaces (
  workbook_id text NOT NULL REFERENCES tesoreria_prevision_juan(id),
  cell_key text NOT NULL,
  section text NOT NULL CHECK(section IN ('income','payments')),
  target_id text,
  status text NOT NULL DEFAULT 'pending',
  note text NOT NULL DEFAULT '',
  PRIMARY KEY(workbook_id,cell_key)
);
COMMENT ON TABLE tesoreria_prevision_juan IS 'Previsión mensual del contable, valores en céntimos y comprobaciones bancarias.';
CREATE TABLE IF NOT EXISTS tesoreria_prevision_juan_aplicaciones (
  workbook_id text NOT NULL REFERENCES tesoreria_prevision_juan(id),
  cell_key text NOT NULL,
  id_linea_banco text NOT NULL REFERENCES tesoreria_movimientos_bancarios(id_linea_banco),
  importe numeric(14,2) NOT NULL CHECK(importe>0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(workbook_id,cell_key,id_linea_banco)
);
