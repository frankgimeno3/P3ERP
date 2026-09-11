ALTER TABLE cargos_recurrentes
  ADD COLUMN IF NOT EXISTS tipo_cargo TEXT NOT NULL DEFAULT 'proveedor',
  ADD COLUMN IF NOT EXISTS id_agente TEXT REFERENCES agentes_db(id_agente);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cargos_recurrentes_destinatario_check' AND conrelid='cargos_recurrentes'::regclass) THEN
    ALTER TABLE cargos_recurrentes ADD CONSTRAINT cargos_recurrentes_destinatario_check
      CHECK ((tipo_cargo='proveedor' AND id_agente IS NULL) OR
             (tipo_cargo='nomina' AND id_agente IS NOT NULL AND id_proveedor IS NULL));
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS cargos_recurrentes_nomina_activa_idx
  ON cargos_recurrentes(id_agente) WHERE activo=TRUE AND tipo_cargo='nomina';
