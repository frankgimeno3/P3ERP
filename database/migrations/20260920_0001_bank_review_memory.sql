-- Additive migration. Existing reviews and forecasts are not rewritten.
CREATE TABLE IF NOT EXISTS tesoreria_cargos_vencimientos (
  id text PRIMARY KEY,
  id_cargo_recurrente bigint NOT NULL,
  id_regla text NOT NULL,
  fecha date NOT NULL,
  importe numeric(16,2) NOT NULL CHECK (importe > 0),
  descripcion text NOT NULL DEFAULT '',
  programacion jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id_cargo_recurrente,id_regla,fecha)
);
CREATE TABLE IF NOT EXISTS tesoreria_vencimientos_aplicaciones (
  id_linea_banco text NOT NULL REFERENCES tesoreria_movimientos_bancarios(id_linea_banco) ON DELETE CASCADE,
  id_vencimiento text NOT NULL REFERENCES tesoreria_cargos_vencimientos(id),
  importe numeric(16,2) NOT NULL CHECK (importe > 0),
  actor text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_linea_banco,id_vencimiento)
);
CREATE INDEX IF NOT EXISTS vencimientos_aplicaciones_vencimiento_idx ON tesoreria_vencimientos_aplicaciones(id_vencimiento);
CREATE TABLE IF NOT EXISTS tesoreria_revision_decisiones (
  id text PRIMARY KEY,
  clave text NOT NULL,
  huella text NOT NULL,
  tipo text NOT NULL,
  movimientos text[] NOT NULL,
  motivo text NOT NULL CHECK (length(trim(motivo)) > 0),
  evidencia jsonb NOT NULL,
  actor text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS revision_decisiones_clave_idx ON tesoreria_revision_decisiones(clave,huella) WHERE revoked_at IS NULL;
CREATE TABLE IF NOT EXISTS tesoreria_revision_criterios (
  id text PRIMARY KEY,
  id_decision text NOT NULL REFERENCES tesoreria_revision_decisiones(id),
  condiciones jsonb NOT NULL,
  actor text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
-- Snapshot legacy discards without inventing a reusable reason or changing bank rows.
INSERT INTO tesoreria_revision_decisiones(id,clave,huella,tipo,movimientos,motivo,evidencia)
SELECT 'legacy:'||id_linea_banco,'legacy:'||id_linea_banco,'','legacy',ARRAY[id_linea_banco],
  'Descarte anterior de duplicados; solo para este movimiento.',to_jsonb(lb)
FROM tesoreria_movimientos_bancarios lb
WHERE COALESCE((to_jsonb(lb)->>'duplicado_descartado')::boolean,false)
ON CONFLICT(id) DO NOTHING;
