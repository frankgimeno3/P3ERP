BEGIN;
SET LOCAL lock_timeout = '10s';
CREATE TABLE IF NOT EXISTS produccion_planillos_previos (
 id_revista text PRIMARY KEY REFERENCES servicios_revistas(id_revista),
 plan jsonb NOT NULL,
 version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE produccion_planillos_previos IS 'Planillo previo editable, con bloques indivisibles y control de concurrencia. No altera contratos ni el planillo definitivo.';
COMMIT;
