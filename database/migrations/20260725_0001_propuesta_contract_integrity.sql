BEGIN;

ALTER TABLE ordenes_db
  ADD COLUMN IF NOT EXISTS id_cobro_contrato text,
  ADD COLUMN IF NOT EXISTS id_cobro_propuesta text;

CREATE INDEX IF NOT EXISTS ordenes_db_id_cobro_contrato_idx ON ordenes_db (id_cobro_contrato);
CREATE INDEX IF NOT EXISTS ordenes_db_id_cobro_propuesta_idx ON ordenes_db (id_cobro_propuesta);
CREATE UNIQUE INDEX IF NOT EXISTS cobros_contratos_db_id_cobro_propuesta_uq
  ON cobros_contratos_db (id_cobro_propuesta)
  WHERE id_cobro_propuesta IS NOT NULL AND id_cobro_propuesta <> '';

CREATE OR REPLACE FUNCTION validate_proposal_acceptance_integrity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF lower(COALESCE(NEW.estado_propuesta, '')) IN ('aceptada', 'aprobada')
     AND lower(COALESCE(OLD.estado_propuesta, '')) NOT IN ('aceptada', 'aprobada') THEN
    IF NOT EXISTS (SELECT 1 FROM lineas_propuestas_db WHERE id_propuesta = NEW.id_propuesta) THEN
      RAISE EXCEPTION 'La propuesta % no puede aceptarse porque no tiene líneas de servicio', NEW.id_propuesta;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM cobros_propuestas_db WHERE id_propuesta = NEW.id_propuesta) THEN
      RAISE EXCEPTION 'La propuesta % no puede aceptarse porque no tiene cobros definidos', NEW.id_propuesta;
    END IF;
    IF EXISTS (
      SELECT 1
      FROM cobros_propuestas_db
      WHERE id_propuesta = NEW.id_propuesta
        AND (fecha_cobro IS NULL OR btrim(fecha_cobro) = '' OR importe_cobro IS NULL OR importe_cobro <= 0)
    ) THEN
      RAISE EXCEPTION 'La propuesta % no puede aceptarse porque tiene cobros incompletos', NEW.id_propuesta;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS propuestas_acceptance_integrity_trigger ON propuestas_db;
CREATE TRIGGER propuestas_acceptance_integrity_trigger
BEFORE UPDATE OF estado_propuesta ON propuestas_db
FOR EACH ROW EXECUTE FUNCTION validate_proposal_acceptance_integrity();

COMMIT;
