BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS public.eventos_de_usuarios (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 fecha TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
 id_usuario TEXT NOT NULL,usuario TEXT NOT NULL,tipo TEXT NOT NULL CHECK(tipo IN ('crear','editar','borrar')),
 descripcion TEXT NOT NULL,ip TEXT,origen_ip TEXT NOT NULL DEFAULT 'no_disponible',
 tabla TEXT NOT NULL,clave JSONB NOT NULL DEFAULT '{}',
 datos_anteriores JSONB,datos_nuevos JSONB,campos_modificados TEXT[] NOT NULL DEFAULT '{}',
 cambios JSONB NOT NULL DEFAULT '[]',
 relaciones JSONB NOT NULL DEFAULT '[]',id_solicitud UUID NOT NULL,transaccion BIGINT NOT NULL,
 ruta TEXT NOT NULL,pagina_origen TEXT,metodo TEXT NOT NULL,profundidad INTEGER NOT NULL DEFAULT 1
);
ALTER TABLE public.eventos_de_usuarios ADD COLUMN IF NOT EXISTS cambios JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.eventos_de_usuarios ADD COLUMN IF NOT EXISTS pagina_origen TEXT;
CREATE INDEX IF NOT EXISTS eventos_usuarios_fecha ON public.eventos_de_usuarios(fecha DESC,id DESC);
CREATE INDEX IF NOT EXISTS eventos_usuarios_solicitud ON public.eventos_de_usuarios(id_solicitud,id);
CREATE INDEX IF NOT EXISTS eventos_usuarios_entidad ON public.eventos_de_usuarios(tabla,fecha DESC);
COMMENT ON TABLE public.eventos_de_usuarios IS 'Historial de escrituras de usuarios autenticados de P3ERP. Lecturas, login y logout no generan eventos. IP observada, sin inferir ubicación.';

CREATE OR REPLACE FUNCTION public.p3_user_event_redact(value JSONB) RETURNS JSONB LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result JSONB; item RECORD;
BEGIN
 IF jsonb_typeof(value)='object' THEN
  result='{}';
  FOR item IN SELECT * FROM jsonb_each(value) LOOP
   result=result||jsonb_build_object(item.key,CASE WHEN item.key ~* '(password|passwd|contrase|secret|token|credential|cookie|authorization|api[_-]?key|private[_-]?key)' THEN '"[protegido]"'::jsonb ELSE public.p3_user_event_redact(item.value) END);
  END LOOP;RETURN result;
 ELSIF jsonb_typeof(value)='array' THEN
  SELECT COALESCE(jsonb_agg(public.p3_user_event_redact(v)),'[]') INTO result FROM jsonb_array_elements(value) v;RETURN result;
 END IF;RETURN value;
END $$;

CREATE OR REPLACE FUNCTION public.p3_user_event_snapshot(row_value ANYELEMENT) RETURNS JSONB LANGUAGE plpgsql STABLE AS $$
DECLARE relation OID; expressions TEXT; result JSONB;
BEGIN
 SELECT typrelid INTO relation FROM pg_type WHERE oid=pg_typeof(row_value)::oid;
 SELECT string_agg(format('(%L,%s)',a.attname,
  CASE WHEN a.attname ~* '(password|passwd|contrase|secret|token|credential|cookie|authorization|api[_-]?key|private[_-]?key)'
   THEN quote_literal('"[protegido]"')||'::jsonb'
   WHEN a.atttypid='bytea'::regtype THEN format('CASE WHEN ($1).%1$I IS NULL THEN ''null''::jsonb ELSE jsonb_build_object(''bytes'',octet_length(($1).%1$I),''sha256'',encode(sha256(($1).%1$I),''hex'')) END',a.attname)
   WHEN a.atttypid IN ('json'::regtype,'jsonb'::regtype) THEN format('public.p3_user_event_redact(COALESCE(to_jsonb(($1).%I),''null''::jsonb))',a.attname)
   ELSE format('CASE WHEN pg_column_size(($1).%1$I)>65536 THEN jsonb_build_object(''resumen'',''Valor de gran tamaño'',''bytes'',pg_column_size(($1).%1$I),''sha256'',encode(sha256(convert_to(public.p3_user_event_redact(to_jsonb(($1).%1$I))::text,''UTF8'')),''hex'')) ELSE public.p3_user_event_redact(COALESCE(to_jsonb(($1).%1$I),''null''::jsonb)) END',a.attname)
  END),',') INTO expressions FROM pg_attribute a WHERE a.attrelid=relation AND a.attnum>0 AND NOT a.attisdropped;
 EXECUTE 'SELECT jsonb_object_agg(k,v) FROM (VALUES '||expressions||') AS fields(k,v)' INTO result USING row_value;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.p3_user_event_changes(before_data JSONB,after_data JSONB,field_path TEXT DEFAULT '') RETURNS JSONB LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result JSONB='[]'; field TEXT; idx INTEGER;
BEGIN
 IF before_data IS NOT DISTINCT FROM after_data THEN RETURN result;END IF;
 IF jsonb_typeof(before_data)='object' AND jsonb_typeof(after_data)='object' THEN
  FOR field IN SELECT jsonb_object_keys(before_data) UNION SELECT jsonb_object_keys(after_data) LOOP
   result=result||public.p3_user_event_changes(before_data->field,after_data->field,CASE WHEN field_path='' THEN field ELSE field_path||'.'||field END);
  END LOOP;
 ELSIF jsonb_typeof(before_data)='array' AND jsonb_typeof(after_data)='array' THEN
  FOR idx IN 0..GREATEST(jsonb_array_length(before_data),jsonb_array_length(after_data))-1 LOOP
   result=result||public.p3_user_event_changes(before_data->idx,after_data->idx,field_path||'['||idx||']');
  END LOOP;
 ELSE result=jsonb_build_array(jsonb_build_object('campo',field_path,'antes',before_data,'despues',after_data));END IF;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.p3_user_event_value(value JSONB) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE WHEN value IS NULL OR value='null'::jsonb THEN 'vacío' WHEN jsonb_typeof(value)='string' THEN left(value#>>'{}',500) ELSE left(value::text,500) END
$$;
CREATE OR REPLACE FUNCTION public.p3_user_event_entity(table_name TEXT) RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE table_name
 WHEN 'cuentas_db' THEN 'cuenta' WHEN 'contactos_db' THEN 'contacto' WHEN 'agentes_db' THEN 'agente'
 WHEN 'comercial_cuentas' THEN 'cuenta' WHEN 'comercial_contactos' THEN 'contacto'
 WHEN 'comercial_propuestas_db' THEN 'propuesta' WHEN 'servicios_revistas' THEN 'revista'
 WHEN 'servicios_db' THEN 'servicio' WHEN 'tesoreria_recibos_importados' THEN 'recibo'
 WHEN 'tesoreria_cargos_recurrentes' THEN 'cargo previsto' WHEN 'tesoreria_ingresos_adicionales' THEN 'ingreso previsto'
 WHEN 'comercial_propuestas' THEN 'propuesta' WHEN 'comercial_contratos' THEN 'contrato'
 WHEN 'produccion_contenidos' THEN 'contenido' WHEN 'produccion_revistas' THEN 'revista'
 WHEN 'administracion_proveedores' THEN 'proveedor' WHEN 'administracion_facturas_clientes' THEN 'factura de cliente'
 WHEN 'administracion_facturas_proveedores' THEN 'factura de proveedor' WHEN 'tesoreria_ordenes' THEN 'orden de cobro'
 WHEN 'tesoreria_recibos' THEN 'recibo' WHEN 'tesoreria_remesas' THEN 'remesa'
 WHEN 'laboral_tareas_empleado' THEN 'tarea' WHEN 'laboral_nominas' THEN 'nómina' WHEN 'laboral_anticipos' THEN 'anticipo'
 WHEN 'administracion_tickets' THEN 'ticket' WHEN 'tesoreria_tarjetas_liquidaciones' THEN 'liquidación de tarjeta'
 ELSE replace(table_name,'_',' ') END
$$;

CREATE OR REPLACE FUNCTION public.p3_user_event_record(relation OID,operation TEXT,before_data JSONB,after_data JSONB,depth INTEGER) RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE context JSONB; snapshot JSONB; table_name TEXT; schema_name TEXT; changed TEXT[]; primary_key JSONB; refs JSONB; label TEXT; detail TEXT; link_detail TEXT; actor TEXT; differences JSONB='[]';
BEGIN
 context=NULLIF(current_setting('p3.user_event_context',true),'')::jsonb;
 IF context IS NULL OR COALESCE((context->>'enabled')::boolean,false)=false OR context->>'actorId' IS NULL OR context->>'method' IN ('GET','HEAD','OPTIONS') THEN RETURN;END IF;
 SELECT c.relname,n.nspname INTO table_name,schema_name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.oid=relation;
 IF table_name='eventos_de_usuarios' OR context->>'route' ~* '(^|/)(login|logout|sign-in|sign-out|validate-token)(/|$)' THEN RETURN;END IF;
 snapshot=COALESCE(after_data,before_data);
 SELECT COALESCE(array_agg(key ORDER BY key),'{}') INTO changed FROM jsonb_object_keys(snapshot) key
 WHERE key NOT IN ('updated_at','created_at','version') AND (operation<>'UPDATE' OR before_data->key IS DISTINCT FROM after_data->key);
 IF operation='UPDATE' AND cardinality(changed)=0 THEN RETURN;END IF;
 IF operation='UPDATE' THEN
  differences=public.p3_user_event_changes(before_data-ARRAY['created_at','updated_at','version'],after_data-ARRAY['created_at','updated_at','version']);
  SELECT array_agg(d->>'campo' ORDER BY d->>'campo'),string_agg((d->>'campo')||' de '||public.p3_user_event_value(d->'antes')||' a '||public.p3_user_event_value(d->'despues'),'; ') INTO changed,detail FROM jsonb_array_elements(differences) d;
 END IF;
 SELECT COALESCE(jsonb_object_agg(a.attname,snapshot->a.attname),'{}') INTO primary_key FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey) WHERE i.indrelid=relation AND i.indisprimary;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('tabla',c.confrelid::regclass::text,'campo',a.attname,'valor',snapshot->a.attname)),'[]') INTO refs FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey) WHERE c.conrelid=relation AND c.contype='f';
 label=COALESCE(NULLIF(snapshot->>'nombre_completo_agente',''),NULLIF(snapshot->>'nombre_cuenta',''),NULLIF(snapshot->>'nombre_empresa',''),NULLIF(snapshot->>'nombre_proveedor',''),NULLIF(snapshot->>'nombre_completo_contacto',''),NULLIF(snapshot->>'nombre_contacto',''),NULLIF(snapshot->>'nombre_contrato',''),NULLIF(snapshot->>'nombre_propuesta',''),NULLIF(snapshot->>'nombre_contenido',''),NULLIF(snapshot->>'titulo',''),NULLIF(snapshot->>'titulo_contenido',''),NULLIF(snapshot->>'nombre_servicio_es',''),NULLIF(snapshot->>'nombre_servicio',''),NULLIF(snapshot->>'codigo_ticket',''),NULLIF(snapshot->>'codigo',''),primary_key::text);
 actor=COALESCE(NULLIF(context->>'actorName',''),context->>'actorId');
 IF label=primary_key::text THEN label=COALESCE(NULLIF(snapshot->>'nombre',''),NULLIF(snapshot->>'concepto',''),NULLIF(snapshot->>'descripcion',''),label);END IF;
 IF operation<>'UPDATE' THEN SELECT string_agg(k||': '||public.p3_user_event_value(snapshot->k),'; ') INTO detail FROM unnest(changed) k;END IF;
 SELECT string_agg((r->>'campo')||'='||public.p3_user_event_value(r->'valor')||' ('||(r->>'tabla')||')','; ') INTO link_detail FROM jsonb_array_elements(refs) r;
 INSERT INTO public.eventos_de_usuarios(id_usuario,usuario,tipo,descripcion,ip,origen_ip,tabla,clave,datos_anteriores,datos_nuevos,campos_modificados,cambios,relaciones,id_solicitud,transaccion,ruta,pagina_origen,metodo,profundidad)
 VALUES(context->>'actorId',actor,CASE operation WHEN 'INSERT' THEN 'crear' WHEN 'UPDATE' THEN 'editar' ELSE 'borrar' END,
  left('El usuario '||actor||CASE operation WHEN 'INSERT' THEN ' ha creado ' WHEN 'UPDATE' THEN ' ha editado ' ELSE ' ha borrado ' END||public.p3_user_event_entity(table_name)||' «'||label||'» en RDS '||table_name||'. '||CASE WHEN operation='UPDATE' THEN 'Cambios: ' ELSE 'Datos '||CASE WHEN operation='DELETE' THEN 'borrados' ELSE 'registrados' END||': ' END||COALESCE(detail,'')||CASE WHEN link_detail IS NOT NULL THEN '. Asociaciones: '||link_detail ELSE '' END,30000),
  NULLIF(context->>'ip',''),COALESCE(context->>'ipSource','no_disponible'),table_name,primary_key,before_data,after_data,changed,differences,refs,(context->>'requestId')::uuid,txid_current(),COALESCE(context->>'route',''),context->>'page',COALESCE(context->>'method',''),depth);
END $$;

CREATE OR REPLACE FUNCTION public.p3_user_event_capture() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE before_data JSONB; after_data JSONB; column_name TEXT; changed BOOLEAN;
BEGIN
 IF NULLIF(current_setting('p3.user_event_context',true),'') IS NULL THEN RETURN NULL;END IF;
 IF TG_OP='INSERT' THEN PERFORM public.p3_user_event_record(TG_RELID,TG_OP,NULL,public.p3_user_event_snapshot(NEW),pg_trigger_depth());
 ELSIF TG_OP='DELETE' THEN PERFORM public.p3_user_event_record(TG_RELID,TG_OP,public.p3_user_event_snapshot(OLD),NULL,pg_trigger_depth());
 ELSE
  before_data=public.p3_user_event_snapshot(OLD);after_data=public.p3_user_event_snapshot(NEW);
  FOR column_name IN SELECT a.attname FROM pg_attribute a WHERE a.attrelid=TG_RELID AND a.attnum>0 AND NOT a.attisdropped AND (a.attname ~* '(password|passwd|contrase|secret|token|credential|cookie|authorization|api[_-]?key|private[_-]?key)' OR a.atttypid IN ('json'::regtype,'jsonb'::regtype)) LOOP
   IF before_data->column_name IS NOT DISTINCT FROM after_data->column_name THEN
    EXECUTE format('SELECT to_jsonb(($1).%1$I) IS DISTINCT FROM to_jsonb(($2).%1$I)',column_name) INTO changed USING OLD,NEW;
    IF changed THEN after_data=jsonb_set(after_data,ARRAY[column_name],'"[contenido protegido modificado]"');END IF;
   END IF;
  END LOOP;
  PERFORM public.p3_user_event_record(TG_RELID,TG_OP,before_data,after_data,pg_trigger_depth());
 END IF;
 RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.p3_user_event_truncate() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE item RECORD;
BEGIN
 IF NULLIF(current_setting('p3.user_event_context',true),'') IS NULL THEN RETURN NULL;END IF;
 FOR item IN EXECUTE format('SELECT public.p3_user_event_snapshot(t) value FROM %I.%I t',TG_TABLE_SCHEMA,TG_TABLE_NAME) LOOP
  PERFORM public.p3_user_event_record(TG_RELID,'DELETE',item.value,NULL,pg_trigger_depth());
 END LOOP;RETURN NULL;
END $$;
CREATE OR REPLACE FUNCTION public.p3_user_event_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'El historial de eventos de usuarios no se puede editar, borrar ni vaciar.';END $$;
DROP TRIGGER IF EXISTS p3_user_event_immutable ON public.eventos_de_usuarios;
CREATE TRIGGER p3_user_event_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON public.eventos_de_usuarios FOR EACH STATEMENT EXECUTE FUNCTION public.p3_user_event_immutable();

CREATE OR REPLACE FUNCTION public.p3_install_user_event_triggers() RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE relation RECORD; installed INTEGER=0;
BEGIN
 FOR relation IN SELECT c.oid,n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relispartition AND c.relname<>'eventos_de_usuarios' LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=relation.oid AND tgname='p3_user_events_row') THEN
   EXECUTE format('CREATE TRIGGER p3_user_events_row AFTER INSERT OR UPDATE OR DELETE ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.p3_user_event_capture()',relation.nspname,relation.relname);installed=installed+1;
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=relation.oid AND tgname='p3_user_events_truncate') THEN
   EXECUTE format('CREATE TRIGGER p3_user_events_truncate BEFORE TRUNCATE ON %I.%I FOR EACH STATEMENT EXECUTE FUNCTION public.p3_user_event_truncate()',relation.nspname,relation.relname);
  END IF;
 END LOOP;RETURN installed;
END $$;
SELECT public.p3_install_user_event_triggers();
COMMIT;
