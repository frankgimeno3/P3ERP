BEGIN;
SET LOCAL lock_timeout='5s';
CREATE INDEX IF NOT EXISTS eventos_usuarios_transaccion ON public.eventos_de_usuarios(transaccion,id_solicitud,id);
-- Called once before commit by AuditedClient. The audit remains the source of
-- field changes; comments summarize an entire operation instead of each row.
CREATE OR REPLACE FUNCTION public.p3_account_operation_comment() RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE context JSONB; item RECORD; comment_id TEXT;
BEGIN
 context=NULLIF(current_setting('p3.user_event_context',true),'')::jsonb;
 IF context IS NULL OR NOT COALESCE((context->>'enabled')::boolean,false)
   OR context->>'method' IN ('GET','HEAD','OPTIONS')
   OR context->>'route' ~ '/propuestas(/|$)' THEN RETURN; END IF;
 FOR item IN
 WITH changes AS (
  SELECT e.*,COALESCE(e.datos_nuevos,e.datos_anteriores) snapshot
  FROM public.eventos_de_usuarios e
  WHERE e.transaccion=txid_current() AND e.id_solicitud=(context->>'requestId')::uuid
   AND e.tabla IN ('comercial_contratos','comercial_contratos_lineas','comercial_contratos_cobros',
     'tesoreria_ordenes','administracion_facturas_clientes','administracion_lineas_factura','produccion_contenidos',
     'tesoreria_recibos_importados','tesoreria_aplicaciones_cobro')
 ), linked AS (
  SELECT e.*,COALESCE(NULLIF(snapshot->>'id_cuenta_contrato',''),NULLIF(snapshot->>'id_cuenta',''),
    c.id_cuenta_contrato,oc.id_cuenta_contrato,NULLIF(o.id_cuenta,''),f.id_cuenta) account_id
  FROM changes e
  LEFT JOIN public.comercial_contratos c ON c.id_contrato=snapshot->>'id_contrato'
  LEFT JOIN public.tesoreria_ordenes o ON o.id_orden=snapshot->>'id_orden'
  LEFT JOIN public.comercial_contratos oc ON oc.id_contrato=o.id_contrato
  LEFT JOIN public.administracion_facturas_clientes f ON f.id_factura_cliente=COALESCE(snapshot->>'id_factura_cliente',snapshot->>'id_factura',o.id_factura)
 ), eligible AS (
  SELECT DISTINCT account_id FROM linked WHERE account_id IS NOT NULL
   AND tipo='editar' AND tabla IN ('comercial_contratos','tesoreria_ordenes','comercial_contratos_lineas','comercial_contratos_cobros')
 )
 SELECT l.account_id,string_agg(l.descripcion,E'\n' ORDER BY l.id) detail
 FROM linked l JOIN eligible q USING(account_id) GROUP BY l.account_id
 LOOP
  comment_id='com_cadena_'||replace(context->>'requestId','-','')||'_'||substr(md5(item.account_id),1,8);
  INSERT INTO public.general_comentarios(id_comentario,id_original_autor,id_last_editor,tipo_entidad,id_entidad,contenido_comentario)
   VALUES(comment_id,context->>'actorId',context->>'actorId','cuenta',item.account_id,item.detail)
  ON CONFLICT(id_comentario) DO UPDATE SET contenido_comentario=general_comentarios.contenido_comentario||E'\n'||EXCLUDED.contenido_comentario,
   id_last_editor=EXCLUDED.id_last_editor;
 END LOOP;
END $$;
COMMIT;
