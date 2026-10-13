BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE comercial_cuentas ADD COLUMN IF NOT EXISTS es_prueba BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE comercial_contactos ADD COLUMN IF NOT EXISTS es_prueba BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE comercial_propuestas_db ADD COLUMN IF NOT EXISTS es_prueba BOOLEAN NOT NULL DEFAULT false,
 ADD COLUMN IF NOT EXISTS enviada BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE comercial_contratos ADD COLUMN IF NOT EXISTS es_prueba BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE administracion_facturas_clientes ADD COLUMN IF NOT EXISTS es_prueba BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tesoreria_ordenes ADD COLUMN IF NOT EXISTS es_prueba BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE produccion_contenidos ADD COLUMN IF NOT EXISTS es_prueba BOOLEAN NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.p3_test_mode_inherit() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE data JSONB=to_jsonb(NEW); pair RECORD; inherited BOOLEAN; key_name TEXT;
BEGIN
 key_name=CASE TG_TABLE_NAME WHEN 'comercial_cuentas' THEN 'id_cuenta' WHEN 'comercial_contactos' THEN 'id_contacto'
 WHEN 'comercial_propuestas_db' THEN 'id_propuesta' WHEN 'comercial_contratos' THEN 'id_contrato'
 WHEN 'administracion_facturas_clientes' THEN 'id_factura_cliente' WHEN 'tesoreria_ordenes' THEN 'id_orden' ELSE 'id_contenido' END;
 NEW.es_prueba=NEW.es_prueba OR (data->>key_name LIKE 'PRUEBA-%');
 IF TG_OP='UPDATE' THEN NEW.es_prueba=NEW.es_prueba OR OLD.es_prueba;END IF;
 FOR pair IN SELECT * FROM (VALUES
  ('comercial_cuentas','id_cuenta',COALESCE(data->>'id_cuenta_propuesta',data->>'id_cuenta_contrato',data->>'id_cuenta')),
  ('comercial_contactos','id_contacto',COALESCE(data->>'id_contacto_propuesta',data->>'id_contacto_contrato')),
  ('comercial_propuestas_db','id_propuesta',data->>'id_propuesta'),
  ('comercial_contratos','id_contrato',data->>'id_contrato'),
  ('tesoreria_ordenes','id_orden',data->>'id_orden_origen'),
  ('administracion_facturas_clientes','id_factura_cliente',data->>'id_factura')
  ,('administracion_facturas_clientes','id_factura_cliente',data->>'factura_origen_id')
 ) r(tabla,campo,valor) WHERE valor IS NOT NULL AND valor<>'' AND (tabla<>TG_TABLE_NAME OR campo='id_factura_cliente' AND data->>'factura_origen_id'=valor) LOOP
  EXECUTE format('SELECT es_prueba FROM public.%I WHERE %I=$1',pair.tabla,pair.campo) INTO inherited USING pair.valor;
  NEW.es_prueba=NEW.es_prueba OR COALESCE(inherited,false) OR pair.valor LIKE 'PRUEBA-%';
 END LOOP;
 IF NEW.es_prueba AND data->>key_name NOT LIKE 'PRUEBA-%' THEN RAISE EXCEPTION 'Los datos de prueba deben usar un identificador con PRUEBA- y no pueden convertirse en datos reales.';END IF;
 RETURN NEW;
END $$;
DO $$ DECLARE name TEXT; BEGIN
 FOREACH name IN ARRAY ARRAY['comercial_cuentas','comercial_contactos','comercial_propuestas_db','comercial_contratos','administracion_facturas_clientes','tesoreria_ordenes','produccion_contenidos'] LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS p3_test_mode ON public.%I',name);
  EXECUTE format('CREATE TRIGGER p3_test_mode BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.p3_test_mode_inherit()',name);
 END LOOP;
END $$;

-- Only the explicit, authenticated selection-delete operation may remove events.
-- UPDATE and TRUNCATE remain forbidden; deleting events creates no new event.
CREATE OR REPLACE FUNCTION public.p3_user_event_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE context JSONB;
BEGIN
 context=COALESCE(NULLIF(current_setting('p3.user_event_context',true),''),'{}')::jsonb;
 IF TG_OP='DELETE' AND current_setting('p3.user_event_delete',true)='true'
  AND COALESCE((context->>'enabled')::boolean,false)
  AND context->>'role' IN ('direccion','superadmin') AND context->>'method'='DELETE' THEN RETURN NULL;END IF;
 RAISE EXCEPTION 'El historial no se puede editar ni vaciar. El borrado requiere selección y confirmación desde Eventos de usuarios.';
END $$;
SELECT public.p3_install_user_event_triggers();
COMMIT;
