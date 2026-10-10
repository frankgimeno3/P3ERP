CREATE TABLE IF NOT EXISTS general_identificadores_alias (
  entidad TEXT NOT NULL,
  id_anterior TEXT NOT NULL,
  id_actual TEXT NOT NULL,
  motivo TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entidad,id_anterior),
  CHECK (id_anterior<>id_actual)
);
CREATE INDEX IF NOT EXISTS general_identificadores_alias_actual ON general_identificadores_alias(entidad,id_actual);
