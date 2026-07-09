BEGIN;

CREATE TABLE IF NOT EXISTS suscripciones_db (
  id_suscripcion text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  id_cuenta text,
  id_propuesta text,
  id_contrato text,
  num_inicial integer,
  num_final integer
);

CREATE INDEX IF NOT EXISTS suscripciones_db_id_cuenta_idx ON suscripciones_db (id_cuenta);
CREATE INDEX IF NOT EXISTS suscripciones_db_id_propuesta_idx ON suscripciones_db (id_propuesta);
CREATE INDEX IF NOT EXISTS suscripciones_db_id_contrato_idx ON suscripciones_db (id_contrato);

INSERT INTO suscripciones_db (
  id_suscripcion,
  id_cuenta,
  id_propuesta,
  id_contrato,
  num_inicial,
  num_final
)
VALUES
  ('sus_26_0001', '62500001', 'prop_25_0000000001', 'contr_25_0000000001', 210, 220),
  ('sus_26_0002', '62500002', 'prop_25_0000000002', 'contr_25_0000000002', 205, 210),
  ('sus_25_0001', '62500003', '', '', 198, 204)
ON CONFLICT (id_suscripcion) DO UPDATE
SET id_cuenta = EXCLUDED.id_cuenta,
    id_propuesta = EXCLUDED.id_propuesta,
    id_contrato = EXCLUDED.id_contrato,
    num_inicial = EXCLUDED.num_inicial,
    num_final = EXCLUDED.num_final,
    updated_at = now();

COMMIT;
