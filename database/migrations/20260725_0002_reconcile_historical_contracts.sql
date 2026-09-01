BEGIN;

-- Remove demonstrably invalid proposal links while preserving valid explicit links.
UPDATE contratos_db c
SET id_propuesta = '', updated_at = NOW()
FROM propuestas_db p
WHERE p.id_propuesta = c.id_propuesta
  AND p.id_cuenta_propuesta <> c.id_cuenta_contrato;

-- Every historical order becomes an explicitly related contractual payment.
INSERT INTO cobros_contratos_db (
  id_cobro_contrato,id_contrato,id_cobro_propuesta,numero_cobro,fecha_cobro,
  importe_cobro,forma_cobro,banco_cobro,observaciones_cobro
)
SELECT
  'ccon_legacy_' || substr(md5(o.id_orden),1,16),
  o.id_contrato,NULL,o.numero_cobro,o.fecha_teorica_cobro,o.cobro_total,o.forma_cobro,
  CASE WHEN o.banco_cobro ILIKE '%santander%' THEN 'Santander' ELSE 'Sabadell' END,
  'Cobro contractual reconstruido desde la orden histórica ' || o.id_orden
FROM ordenes_db o
JOIN contratos_db c ON c.id_contrato=o.id_contrato
WHERE o.id_contrato IS NOT NULL
  AND (o.id_cobro_contrato IS NULL OR o.id_cobro_contrato='')
  AND NOT EXISTS (SELECT 1 FROM cobros_contratos_db cc WHERE cc.id_cobro_contrato='ccon_legacy_' || substr(md5(o.id_orden),1,16))
ON CONFLICT (id_cobro_contrato) DO NOTHING;

DELETE FROM cobros_contratos_db cc
USING ordenes_db o
WHERE cc.id_cobro_contrato='ccon_legacy_' || substr(md5(o.id_orden),1,16)
  AND o.id_cobro_contrato IS NOT NULL
  AND o.id_cobro_contrato<>''
  AND o.id_cobro_contrato<>cc.id_cobro_contrato;

UPDATE ordenes_db o
SET id_cobro_contrato='ccon_legacy_' || substr(md5(o.id_orden),1,16),
    id_cuenta=c.id_cuenta_contrato,
    updated_at=NOW()
FROM contratos_db c
WHERE c.id_contrato=o.id_contrato
  AND (o.id_cobro_contrato IS NULL OR o.id_cobro_contrato='');

-- Materialize missing contents referenced by historical contract-line URLs.
INSERT INTO contenidos_db (id_contenido)
SELECT DISTINCT regexp_replace(lc.url_contenido,'^.*/','')
FROM lineas_contratos_db lc
WHERE btrim(lc.url_contenido)<>''
  AND regexp_replace(lc.url_contenido,'^.*/','')<>''
  AND NOT EXISTS (
    SELECT 1 FROM contenidos_db co
    WHERE co.id_contenido=regexp_replace(lc.url_contenido,'^.*/','')
  )
ON CONFLICT (id_contenido) DO NOTHING;

UPDATE contenidos_db co
SET id_contrato=lc.id_contrato,
    id_linea_contrato=lc.id_linea_contrato,
    id_cuenta=c.id_cuenta_contrato,
    id_agente=c.id_agente_contrato,
    nombre_contenido=COALESCE(NULLIF(co.nombre_contenido,''),NULLIF(lc.producto,''),'Contenido contratado'),
    tipo_contenido=COALESCE(NULLIF(co.tipo_contenido,''),NULLIF(lc.medio,''),'contenido'),
    fecha_publicacion=COALESCE(NULLIF(co.fecha_publicacion,''),lc.fecha_publicacion_publicacion,''),
    ano_publicacion=COALESCE(NULLIF(co.ano_publicacion,''),(regexp_match(lc.fecha_publicacion_publicacion,'(20[0-9]{2})'))[1],''),
    servicio=COALESCE(NULLIF(co.servicio,''),NULLIF(lc.id_servicio,''),NULLIF(lc.producto,''),''),
    contenido_especifico_id=COALESCE(NULLIF(co.contenido_especifico_id,''),NULLIF(lc.id_publicacion,''),''),
    updated_at=NOW()
FROM lineas_contratos_db lc
JOIN contratos_db c ON c.id_contrato=lc.id_contrato
WHERE btrim(lc.url_contenido)<>''
  AND co.id_contenido=regexp_replace(lc.url_contenido,'^.*/','');

UPDATE lineas_contratos_db lc
SET array_id_contenidos=jsonb_build_array(regexp_replace(lc.url_contenido,'^.*/','')),
    updated_at=NOW()
WHERE btrim(lc.url_contenido)<>'';

UPDATE contratos_db c
SET array_contenidos=COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id_contenido',co.id_contenido) ORDER BY lc.numero_linea_contrato)
      FROM lineas_contratos_db lc
      JOIN contenidos_db co ON co.id_linea_contrato=lc.id_linea_contrato
      WHERE lc.id_contrato=c.id_contrato
    ),'[]'::jsonb),
    updated_at=NOW()
WHERE EXISTS (SELECT 1 FROM lineas_contratos_db lc WHERE lc.id_contrato=c.id_contrato);

-- Remove legacy duplicates if this reconciliation is rerun after a modern conversion.
UPDATE contenidos_db co
SET id_gestion_prod=(
      SELECT gp.id_gestion_prod
      FROM gestiones_produccion_db gp
      WHERE gp.id_contenido=co.id_contenido
        AND gp.id_gestion_prod NOT LIKE 'gprod_legacy_%'
      ORDER BY gp.created_at
      LIMIT 1
    ),
    updated_at=NOW()
FROM lineas_contratos_db lc
WHERE co.id_linea_contrato=lc.id_linea_contrato
  AND lc.id_linea_propuesta IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM gestiones_produccion_db gp
    WHERE gp.id_contenido=co.id_contenido
      AND gp.id_gestion_prod NOT LIKE 'gprod_legacy_%'
  );

DELETE FROM gestiones_produccion_db gp
USING contenidos_db co,lineas_contratos_db lc
WHERE gp.id_contenido=co.id_contenido
  AND co.id_linea_contrato=lc.id_linea_contrato
  AND lc.id_linea_propuesta IS NOT NULL
  AND gp.id_gestion_prod LIKE 'gprod_legacy_%';

DELETE FROM tareas_db t
USING lineas_contratos_db lc
WHERE t.id_tarea='tar_materiales_legacy_' || substr(md5(lc.id_linea_contrato),1,16)
  AND lc.id_linea_propuesta IS NOT NULL;

DELETE FROM tareas_db t
USING contratos_db c
WHERE t.id_tarea='tar_factura_legacy_' || substr(md5(c.id_contrato),1,16)
  AND left(c.id_contrato,4)='con_';

-- Use the existing production list rather than creating a duplicate list.
DO $$
DECLARE
  target_list text;
  item record;
BEGIN
  SELECT id_lista_gestiones_prod INTO target_list
  FROM gestiones_prod_listas
  WHERE lower(nombre_lista)=lower('Contenidos contratados pendientes de recibir materiales')
    AND pestana_lista='revista'
  ORDER BY created_at ASC LIMIT 1;

  IF target_list IS NULL THEN
    target_list := 'lista_contenidos_contratados_pendientes_materiales';
    INSERT INTO gestiones_prod_listas (
      id_lista_gestiones_prod,nombre_lista,array_objetos_gestiones,posicion_lista,pestana_lista
    ) VALUES (
      target_list,'Contenidos contratados pendientes de recibir materiales','[]'::jsonb,
      COALESCE((SELECT MAX(posicion_lista)+1 FROM gestiones_prod_listas WHERE pestana_lista='revista'),0),'revista'
    ) ON CONFLICT (id_lista_gestiones_prod) DO NOTHING;
  END IF;

  FOR item IN
    SELECT lc.*,c.id_cuenta_contrato,c.id_agente_contrato,co.id_contenido
    FROM lineas_contratos_db lc
    JOIN contratos_db c ON c.id_contrato=lc.id_contrato
    JOIN contenidos_db co ON co.id_linea_contrato=lc.id_linea_contrato
    WHERE lc.id_linea_propuesta IS NULL
  LOOP
    INSERT INTO gestiones_produccion_db (
      id_gestion_prod,nombre_gestion,array_ids_cuentas,array_ids_contenidos,
      id_contrato,id_contenido,id_lista_gestiones_prod,tipo_contenido
    ) VALUES (
      'gprod_legacy_' || substr(md5(item.id_linea_contrato),1,16),
      'Materiales: ' || COALESCE(NULLIF(item.producto,''),item.id_linea_contrato),
      jsonb_build_array(item.id_cuenta_contrato),jsonb_build_array(item.id_contenido),
      item.id_contrato,item.id_contenido,target_list,
      CASE WHEN lower(COALESCE(item.producto,'')) LIKE '%anuncio%' THEN 'anuncio' ELSE 'articulo' END
    )
    ON CONFLICT (id_gestion_prod) DO UPDATE SET
      array_ids_cuentas=EXCLUDED.array_ids_cuentas,array_ids_contenidos=EXCLUDED.array_ids_contenidos,
      id_contrato=EXCLUDED.id_contrato,id_contenido=EXCLUDED.id_contenido,
      id_lista_gestiones_prod=EXCLUDED.id_lista_gestiones_prod,updated_at=NOW();

    UPDATE contenidos_db
    SET id_gestion_prod='gprod_legacy_' || substr(md5(item.id_linea_contrato),1,16),updated_at=NOW()
    WHERE id_contenido=item.id_contenido;

    UPDATE gestiones_prod_listas
    SET array_objetos_gestiones=CASE WHEN EXISTS (
      SELECT 1 FROM jsonb_array_elements(COALESCE(array_objetos_gestiones,'[]'::jsonb)) element
      WHERE element->>1='gprod_legacy_' || substr(md5(item.id_linea_contrato),1,16)
    ) THEN array_objetos_gestiones
    ELSE COALESCE(array_objetos_gestiones,'[]'::jsonb)
      || jsonb_build_array(jsonb_build_array(jsonb_array_length(COALESCE(array_objetos_gestiones,'[]'::jsonb)),
         'gprod_legacy_' || substr(md5(item.id_linea_contrato),1,16))) END,
      updated_at=NOW()
    WHERE id_lista_gestiones_prod=target_list;
  END LOOP;
END $$;

-- Ensure every responsible agent has a General task list.
INSERT INTO tareas_listas (id_lista_tareas,nombre_lista_tareas,id_agente,orden_lista)
SELECT 'lis_general_' || substr(md5(agent.id_agente),1,16),'general',agent.id_agente,0
FROM (
  SELECT DISTINCT id_agente_contrato AS id_agente FROM contratos_db WHERE btrim(id_agente_contrato)<>''
  UNION SELECT 'ag_25_0005'
) agent
WHERE NOT EXISTS (
  SELECT 1 FROM tareas_listas tl
  WHERE tl.id_agente=agent.id_agente AND lower(tl.nombre_lista_tareas)='general'
)
ON CONFLICT (id_lista_tareas) DO NOTHING;

INSERT INTO tareas_db (
  id_tarea,agente,titulo,contenido,descripcion,estado,prioridad,ordenante,lista_tareas,
  relacionada_con_cuenta,relacionada_con_contenido,contrato_id
)
SELECT
  'tar_materiales_legacy_' || substr(md5(lc.id_linea_contrato),1,16),
  c.id_agente_contrato,
  'Seguimiento de materiales: ' || COALESCE(NULLIF(lc.producto,''),lc.id_linea_contrato),
  'Solicitar y hacer seguimiento de los materiales del contenido ' || co.id_contenido || '.',
  'Tarea reconstruida desde la línea contractual histórica ' || lc.id_linea_contrato || '.',
  'pendiente','media','reconciliación de contratos',
  (SELECT id_lista_tareas FROM tareas_listas WHERE id_agente=c.id_agente_contrato AND lower(nombre_lista_tareas)='general' ORDER BY created_at LIMIT 1),
  c.id_cuenta_contrato,co.id_contenido,c.id_contrato
FROM lineas_contratos_db lc
JOIN contratos_db c ON c.id_contrato=lc.id_contrato
JOIN contenidos_db co ON co.id_linea_contrato=lc.id_linea_contrato
WHERE lc.id_linea_propuesta IS NULL
ON CONFLICT (id_tarea) DO NOTHING;

INSERT INTO tareas_db (
  id_tarea,agente,titulo,contenido,descripcion,estado,prioridad,ordenante,lista_tareas,
  relacionada_con_cuenta,contrato_id
)
SELECT
  'tar_factura_legacy_' || substr(md5(c.id_contrato),1,16),'ag_25_0005',
  'Crear factura para contrato ' || c.id_contrato,
  'Crear la factura del contrato ' || c.id_contrato || '.',
  'Tarea reconstruida durante la reconciliación de contratos.',
  'pendiente','alta','reconciliación de contratos',
  (SELECT id_lista_tareas FROM tareas_listas WHERE id_agente='ag_25_0005' AND lower(nombre_lista_tareas)='general' ORDER BY created_at LIMIT 1),
  c.id_cuenta_contrato,c.id_contrato
FROM contratos_db c
WHERE left(c.id_contrato,6)='contr_'
ON CONFLICT (id_tarea) DO NOTHING;

-- Remove stale list references and normalize positions after reconciliation.
UPDATE gestiones_prod_listas list
SET array_objetos_gestiones=COALESCE((
  SELECT jsonb_agg(jsonb_build_array(items.position,items.id_gestion) ORDER BY items.position)
  FROM (
    SELECT row_number() OVER (ORDER BY element.ordinality)-1 AS position,element.value->>1 AS id_gestion
    FROM jsonb_array_elements(COALESCE(list.array_objetos_gestiones,'[]'::jsonb)) WITH ORDINALITY element(value,ordinality)
    WHERE EXISTS (SELECT 1 FROM gestiones_produccion_db gp WHERE gp.id_gestion_prod=element.value->>1)
  ) items
),'[]'::jsonb),
updated_at=NOW();

COMMIT;
