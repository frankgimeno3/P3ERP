ALTER TABLE lineas_bancos
  ADD COLUMN IF NOT EXISTS id_agente TEXT REFERENCES agentes_db(id_agente) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duplicado_descartado BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS lineas_bancos_id_agente_idx ON lineas_bancos (id_agente);

