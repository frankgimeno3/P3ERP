-- Keep source records and original values; canonical contents retain their IDs.
ALTER TABLE produccion_contenidos
 ADD COLUMN IF NOT EXISTS paginas_ocupadas numeric(8,2),
 ADD COLUMN IF NOT EXISTS posicion_revista integer,
 ADD COLUMN IF NOT EXISTS correccion_destino text NOT NULL DEFAULT 'otros',
 ADD COLUMN IF NOT EXISTS titulo_articulo text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS entradilla_articulo text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS texto_articulo text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS texto_revision integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS texto_revision_descargada integer NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS texto_fecha_descarga timestamptz,
 ADD COLUMN IF NOT EXISTS datos_editoriales jsonb NOT NULL DEFAULT '{}',
 ADD COLUMN IF NOT EXISTS articulo_origen_id bigint;
CREATE UNIQUE INDEX IF NOT EXISTS content_editorial_origin_unique ON produccion_contenidos(articulo_origen_id) WHERE articulo_origen_id IS NOT NULL;
ALTER TABLE produccion_materiales
 ADD COLUMN IF NOT EXISTS descargado_produccion boolean NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS fecha_descarga_produccion timestamptz,
 ADD COLUMN IF NOT EXISTS agente_descarga_produccion text,
 ADD COLUMN IF NOT EXISTS agente_subida text,
 ADD COLUMN IF NOT EXISTS nombre_agente_subida text,
 ADD COLUMN IF NOT EXISTS material_valido boolean NOT NULL DEFAULT true;
ALTER TABLE laboral_tareas_empleado
 ADD COLUMN IF NOT EXISTS comentarios_agente text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS agente_creacion text,
 ADD COLUMN IF NOT EXISTS nombre_agente_creacion text,
 ADD COLUMN IF NOT EXISTS fecha_finalizacion timestamptz,
 ADD COLUMN IF NOT EXISTS agente_finalizacion text,
 ADD COLUMN IF NOT EXISTS nombre_agente_finalizacion text;
ALTER TABLE comercial_cuenta_tareas
 ADD COLUMN IF NOT EXISTS comentarios_agente text NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS agente_creacion text,
 ADD COLUMN IF NOT EXISTS nombre_agente_creacion text,
 ADD COLUMN IF NOT EXISTS fecha_finalizacion timestamptz,
 ADD COLUMN IF NOT EXISTS agente_finalizacion text,
 ADD COLUMN IF NOT EXISTS nombre_agente_finalizacion text;

CREATE OR REPLACE FUNCTION p3_normalize_content_state(value text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE
 WHEN lower(trim(coalesce(value,''))) IN ('anulado','no sale','no se publica','cancelado','cancelada') THEN 'Anulado'
 WHEN lower(trim(value)) IN ('pendiente publicar','pendiente de publicar','no publicado','pte. publicar gratis') THEN 'Material OK - pendiente de publicar'
 WHEN lower(trim(value)) IN ('publicado gratis','publicado') THEN 'Publicado'
 WHEN lower(trim(value)) IN ('no pedido','pedido, envia viernes','pendiente de recibir materiales','contratado pendiente de recibir') THEN 'Contratado pendiente de recibir'
 WHEN lower(trim(value)) IN ('maquetación','pendiente maquetación','pasado a paco','pasado a carlos','pendiente pasar producción') THEN 'Pendiente de gestionar Charly'
 WHEN lower(trim(value)) IN ('corregido','pendiente revisión') THEN 'Pendiente revisión cliente'
 WHEN lower(trim(value)) IN ('a escoger','sin estado') THEN ''
 ELSE trim(coalesce(value,'')) END
$$;
CREATE OR REPLACE FUNCTION p3_content_workflow_fields() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.estado_contenido=p3_normalize_content_state(NEW.estado_contenido);
 IF NEW.correccion_destino NOT IN ('gm','otros') THEN RAISE EXCEPTION 'Destino de corrección inválido'; END IF;
 IF NEW.paginas_ocupadas<0 OR NEW.posicion_revista< -1 THEN RAISE EXCEPTION 'Páginas o posición inválidas'; END IF;
 IF TG_OP='UPDATE' AND (NEW.titulo_articulo,NEW.entradilla_articulo,NEW.texto_articulo) IS DISTINCT FROM (OLD.titulo_articulo,OLD.entradilla_articulo,OLD.texto_articulo) THEN
  NEW.texto_revision=OLD.texto_revision+1;
 ELSEIF TG_OP='INSERT' AND concat(NEW.titulo_articulo,NEW.entradilla_articulo,NEW.texto_articulo)<>'' THEN NEW.texto_revision=1;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS p3_content_workflow_fields ON produccion_contenidos;
CREATE TRIGGER p3_content_workflow_fields BEFORE INSERT OR UPDATE ON produccion_contenidos FOR EACH ROW EXECUTE FUNCTION p3_content_workflow_fields();

CREATE OR REPLACE FUNCTION p3_task_lifecycle() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ctx jsonb=coalesce(nullif(current_setting('p3.user_event_context',true),''),'{}')::jsonb;
BEGIN
 IF TG_OP='INSERT' THEN
  NEW.agente_creacion=nullif(ctx->>'actorId',''); NEW.nombre_agente_creacion=nullif(ctx->>'actorName','');
 ELSE
  NEW.created_at=OLD.created_at; NEW.agente_creacion=OLD.agente_creacion; NEW.nombre_agente_creacion=OLD.nombre_agente_creacion;
 END IF;
 IF NEW.estado='completada' AND (TG_OP='INSERT' OR OLD.estado IS DISTINCT FROM NEW.estado) THEN
  NEW.fecha_finalizacion=clock_timestamp(); NEW.agente_finalizacion=nullif(ctx->>'actorId',''); NEW.nombre_agente_finalizacion=nullif(ctx->>'actorName','');
 ELSEIF NEW.estado<>'completada' THEN
  NEW.fecha_finalizacion=null; NEW.agente_finalizacion=null; NEW.nombre_agente_finalizacion=null;
 ELSEIF TG_OP='UPDATE' THEN
  NEW.fecha_finalizacion=OLD.fecha_finalizacion; NEW.agente_finalizacion=OLD.agente_finalizacion; NEW.nombre_agente_finalizacion=OLD.nombre_agente_finalizacion;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS p3_task_lifecycle ON laboral_tareas_empleado;
CREATE TRIGGER p3_task_lifecycle BEFORE INSERT OR UPDATE ON laboral_tareas_empleado FOR EACH ROW EXECUTE FUNCTION p3_task_lifecycle();
DROP TRIGGER IF EXISTS p3_task_lifecycle ON comercial_cuenta_tareas;
CREATE TRIGGER p3_task_lifecycle BEFORE INSERT OR UPDATE ON comercial_cuenta_tareas FOR EACH ROW EXECUTE FUNCTION p3_task_lifecycle();
CREATE OR REPLACE FUNCTION p3_material_lifecycle() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ctx jsonb=coalesce(nullif(current_setting('p3.user_event_context',true),''),'{}')::jsonb;
BEGIN
 IF TG_OP='INSERT' THEN NEW.agente_subida=nullif(ctx->>'actorId',''); NEW.nombre_agente_subida=nullif(ctx->>'actorName','');
 ELSE NEW.agente_subida=OLD.agente_subida; NEW.nombre_agente_subida=OLD.nombre_agente_subida; NEW.fecha_aportado=OLD.fecha_aportado; END IF;
 IF NEW.descargado_produccion AND (TG_OP='INSERT' OR NOT OLD.descargado_produccion) THEN
  NEW.fecha_descarga_produccion=clock_timestamp(); NEW.agente_descarga_produccion=nullif(ctx->>'actorId','');
 ELSEIF NOT NEW.descargado_produccion THEN NEW.fecha_descarga_produccion=null; NEW.agente_descarga_produccion=null;
 ELSEIF TG_OP='UPDATE' THEN NEW.fecha_descarga_produccion=OLD.fecha_descarga_produccion; NEW.agente_descarga_produccion=OLD.agente_descarga_produccion;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS p3_material_lifecycle ON produccion_materiales;
CREATE TRIGGER p3_material_lifecycle BEFORE INSERT OR UPDATE ON produccion_materiales FOR EACH ROW EXECUTE FUNCTION p3_material_lifecycle();
SELECT public.p3_install_user_event_triggers();
UPDATE servicios_grupos_servicios SET nombre_medio='Banner news' WHERE id_medio='vidrioperfil_newsletter' AND nombre_medio IS DISTINCT FROM 'Banner news';

UPDATE produccion_contenidos SET datos_importacion=coalesce(datos_importacion,'{}')||jsonb_build_object('estado_previo_20261107',estado_contenido),estado_contenido=p3_normalize_content_state(estado_contenido)
 WHERE estado_contenido IS DISTINCT FROM p3_normalize_content_state(estado_contenido) AND NOT coalesce(datos_importacion,'{}') ? 'estado_previo_20261107';
UPDATE produccion_contenidos c SET articulo_origen_id=e.id,datos_editoriales=to_jsonb(e),
 titulo_articulo=CASE WHEN c.titulo_articulo='' THEN coalesce(e.titulo,'') ELSE c.titulo_articulo END,
 paginas_ocupadas=CASE WHEN e.paginas ~ '^\d+(\.\d+)?$' THEN e.paginas::numeric ELSE c.paginas_ocupadas END,
 destino_revista=(coalesce(e.revista,'') NOT IN ('','No Aplica')),destino_vidrioperfil=(coalesce(e.estado_publicacion_vidrioperfil,'')<>'' OR c.destino_vidrioperfil),
 tipo_contenido=CASE WHEN c.tipo_contenido IN ('','otro') THEN 'articulo' ELSE c.tipo_contenido END
 FROM produccion_control_redaccion e WHERE e.id_contenido=c.id_contenido AND c.articulo_origen_id IS NULL;
-- The source is retained for historical imports, but interactive writes are retired.
COMMENT ON TABLE produccion_control_redaccion IS 'Histórico trasladado a produccion_contenidos.datos_editoriales el 2026-11-07; no admite altas desde la aplicación.';
CREATE OR REPLACE VIEW produccion_articulos_contenidos AS
 SELECT e.* FROM produccion_contenidos c CROSS JOIN LATERAL jsonb_populate_record(null::produccion_control_redaccion,
 c.datos_editoriales||jsonb_build_object('id',c.articulo_origen_id,'id_contenido',c.id_contenido,'id_cuenta',c.id_cuenta,
 'titulo',c.titulo_articulo,'estado',c.estado_contenido,'paginas',coalesce(c.paginas_ocupadas::text,''),'updated_at',c.updated_at)) e
 WHERE c.articulo_origen_id IS NOT NULL;
