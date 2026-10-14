BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE comercial_contratos ADD COLUMN IF NOT EXISTS id_agente_propuesta_contrato TEXT;
ALTER TABLE administracion_lineas_factura ADD COLUMN IF NOT EXISTS modo_precio TEXT NOT NULL DEFAULT 'calculado';
ALTER TABLE administracion_lineas_factura ADD COLUMN IF NOT EXISTS precio_total_personalizado NUMERIC;
UPDATE comercial_contratos c SET id_agente_propuesta_contrato=COALESCE(NULLIF(p.id_agente_propuesta,''),c.id_agente_contrato)
 FROM comercial_propuestas_db p WHERE p.id_propuesta=c.id_propuesta AND c.id_agente_propuesta_contrato IS NULL;
UPDATE comercial_contratos SET id_agente_propuesta_contrato=id_agente_contrato WHERE id_agente_propuesta_contrato IS NULL;
CREATE OR REPLACE FUNCTION public.p3_contract_origin_agent() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  NEW.id_agente_propuesta_contrato=COALESCE(NEW.id_agente_propuesta_contrato,(SELECT id_agente_propuesta FROM comercial_propuestas_db WHERE id_propuesta=NEW.id_propuesta),NEW.id_agente_contrato);
 ELSIF NEW.id_agente_propuesta_contrato IS DISTINCT FROM OLD.id_agente_propuesta_contrato THEN
  RAISE EXCEPTION 'El agente de la propuesta de origen no se puede modificar.';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS p3_contract_origin_agent ON comercial_contratos;
CREATE TRIGGER p3_contract_origin_agent BEFORE INSERT OR UPDATE ON comercial_contratos FOR EACH ROW EXECUTE FUNCTION public.p3_contract_origin_agent();
ALTER TABLE tesoreria_recibos_importados DROP CONSTRAINT prevision_recibos_excel_id_orden_fkey;
ALTER TABLE tesoreria_recibos_importados ADD CONSTRAINT prevision_recibos_excel_id_orden_fkey FOREIGN KEY(id_orden) REFERENCES tesoreria_ordenes(id_orden) ON UPDATE CASCADE;
ALTER TABLE tesoreria_aplicaciones_cobro DROP CONSTRAINT banco_cobros_ordenes_id_orden_fkey;
ALTER TABLE tesoreria_aplicaciones_cobro ADD CONSTRAINT banco_cobros_ordenes_id_orden_fkey FOREIGN KEY(id_orden) REFERENCES tesoreria_ordenes(id_orden) ON UPDATE CASCADE;
ALTER TABLE tesoreria_movimientos_bancarios DROP CONSTRAINT lineas_bancos_id_orden_fkey;
ALTER TABLE tesoreria_movimientos_bancarios ADD CONSTRAINT lineas_bancos_id_orden_fkey FOREIGN KEY(id_orden) REFERENCES tesoreria_ordenes(id_orden) ON UPDATE CASCADE ON DELETE SET NULL;
COMMIT;
