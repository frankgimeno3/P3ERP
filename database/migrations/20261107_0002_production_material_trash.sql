ALTER TABLE produccion_materiales
 ADD COLUMN IF NOT EXISTS eliminado_at timestamptz,
 ADD COLUMN IF NOT EXISTS eliminado_por text,
 ADD COLUMN IF NOT EXISTS nombre_agente_eliminacion text;
CREATE INDEX IF NOT EXISTS production_active_materials ON produccion_materiales(id_contenido,tipo) WHERE eliminado_at IS NULL;
CREATE OR REPLACE FUNCTION p3_material_trash_fields() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ctx jsonb=coalesce(nullif(current_setting('p3.user_event_context',true),''),'{}')::jsonb;
BEGIN
 IF NEW.eliminado_at IS NOT NULL AND (TG_OP='INSERT' OR OLD.eliminado_at IS NULL) THEN
  NEW.eliminado_at=clock_timestamp();NEW.eliminado_por=nullif(ctx->>'actorId','');NEW.nombre_agente_eliminacion=nullif(ctx->>'actorName','');
 ELSEIF NEW.eliminado_at IS NULL THEN NEW.eliminado_por=null;NEW.nombre_agente_eliminacion=null;
 ELSEIF TG_OP='UPDATE' THEN NEW.eliminado_at=OLD.eliminado_at;NEW.eliminado_por=OLD.eliminado_por;NEW.nombre_agente_eliminacion=OLD.nombre_agente_eliminacion;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS p3_material_trash_fields ON produccion_materiales;
CREATE TRIGGER p3_material_trash_fields BEFORE INSERT OR UPDATE ON produccion_materiales FOR EACH ROW EXECUTE FUNCTION p3_material_trash_fields();
COMMENT ON COLUMN produccion_materiales.eliminado_at IS 'Papelera del contenido. Conserva el objeto S3 y el número histórico de versión para restaurar sin sobrescribir.';
SELECT public.p3_install_user_event_triggers();
