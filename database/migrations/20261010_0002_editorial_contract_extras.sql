BEGIN;
ALTER TABLE comercial_contratos ADD COLUMN IF NOT EXISTS agregados_extra_post_contrato JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE produccion_control_redaccion ADD COLUMN IF NOT EXISTS id_contrato_extra TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS contratos_extras_contenidos_idx ON comercial_contratos USING gin(agregados_extra_post_contrato);
COMMIT;
