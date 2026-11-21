INSERT INTO operaciones_clasificaciones(clase,nombre) VALUES
 ('actividades-cuentas','AUTOMATISMOS PARA PUERTAS'),
 ('actividades-cuentas','CERRAMIENTOS ACRISTALADOS'),
 ('actividades-cuentas','HERRAJES CARPINTERÍA FABRICANTES'),
 ('actividades-cuentas','HERRAJES ACCESORIOS PUERTAS'),
 ('actividades-cuentas','PUERTAS CORTAFUEGO Y TÉCNICAS'),
 ('actividades-cuentas','PUERTAS BLINDADAS Y DE SEGURIDAD'),
 ('actividades-cuentas','MUELAS Y HERRAMIENTAS VIDRIO'),
 ('actividades-cuentas','PROTECCIÓN SOLAR'),
 ('actividades-cuentas','ASOCIACIONES FERIAS Y ORGANISMOS'),
 ('actividades-cuentas','COMUNICACIÓN'),
 ('actividades-cuentas','SOFTWARE Y SERVICIOS CARPINTERÍA'),
 ('actividades-cuentas','SERVICIOS Y CONSULTORÍA VIDRIO'),
 ('actividades-cuentas','SILICONAS Y SELLANTES VIDRIO'),
 ('actividades-cuentas','VIDRIERAS ARTE EN VIDRIO'),
 ('actividades-cuentas','LÁMINAS VIDRIO'),
 ('actividades-cuentas','HERRAJES VIDRIO DISTRIBUIDORES'),
 ('actividades-cuentas','MAQUINARIA VIDRIO FABRICANTES'),
 ('actividades-cuentas','MAQUINARIA VIDRIO DISTRIBUIDORES'),
 ('actividades-cuentas','SUMINISTROS DOBLE ACRISTALAMIENTO'),
 ('actividades-cuentas','TRANSFORMADOR VIDRIO PLANO'),
 ('actividades-cuentas','CRISTALERIA EN GENERAL'),
 ('actividades-cuentas','VIDRIOS ESPECIALES'),
 ('actividades-cuentas','VIDRIO LAMINADO'),
 ('actividades-cuentas','SISTEMAS CARPINTERÍA ALUMINIO'),
 ('actividades-cuentas','SISTEMAS CARPINTERÍA PVC'),
 ('actividades-cuentas','PVC GRANDES FABRICANTES'),
 ('actividades-cuentas','CARPINTERÍAS DE PVC'),
 ('actividades-cuentas','HERRAJES VIDRIO FABRICANTES'),
 ('actividades-cuentas','VIDRIO DECORADO GRABADO COLOR'),
 ('actividades-cuentas','MOLDEADOS VIDRIO HUECO'),
 ('actividades-cuentas','PERSIANAS FABRICANTES'),
 ('actividades-cuentas','PUERTAS AUTOMÁTICAS FABRICANTE'),
 ('actividades-cuentas','PUERTAS EXTERIORES E INDUSTRIALES'),
 ('actividades-cuentas','TOLDOS Y TEJIDOS FABRICANTES'),
 ('actividades-cuentas','JUNTAS Y BURLETES ESTANQUEIDAD'),
 ('actividades-cuentas','OTROS PRODUCTOS DE CARPINTERÍA'),
 ('actividades-cuentas','PÉRGOLAS'),
 ('actividades-cuentas','EXTRUSORES Y TRATAMIENTO DE SUPERFICIES'),
 ('actividades-cuentas','PANELES COMPUESTOS FACHADAS'),
 ('actividades-cuentas','CARPINTERÍAS TALLERES E INSTALADORES'),
 ('actividades-cuentas','ALMACENES Y GRANDES FABRICANTES ALUMINIO'),
 ('actividades-cuentas','FACHADISTAS Y ACRISTALAMIENTOS'),
 ('actividades-cuentas','PUERTAS AUTOMÁTICAS DISTRIBUIDOR INSTALADOR'),
 ('actividades-cuentas','PUERTAS MADERA E INTERIOR'),
 ('actividades-cuentas','MOLDEADOS DE VIDRIO HUECO'),
 ('actividades-cuentas','PRODUCTOS FINALES VIDRIO'),
 ('actividades-cuentas','SISTEMAS MADERA Y MIXTAS'),
 ('actividades-cuentas','SECTOR MADERA'),
 ('actividades-cuentas','CERRAJERÍAS Y METALISTERÍAS'),
 ('actividades-cuentas','MOSQUITERAS'),
 ('actividades-cuentas','TOLDOS PERSIANAS PROTECCIÓN SOLAR INSTALADORES'),
 ('actividades-cuentas','CONSTRUCTORA'),
 ('actividades-cuentas','VENTANAS ESPECIALES'),
 ('actividades-cuentas','SISTEMAS CARPINTERÍA HIERRO Y ACERO'),
 ('actividades-cuentas','ESTORES Y CORTINAS'),
 ('actividades-cuentas','ARQUITECTOS'),
 ('actividades-cuentas','ALMACEN MATERIAL CONSTRUCCIÓN'),
 ('actividades-cuentas','AUTOMATISMOS Y ACCESORIOS PROTECCIÓN SOLAR'),
 ('actividades-cuentas','HERRAJES CARPINTERÍA DISTRIBUIDORES'),
 ('actividades-cuentas','FOLIOS PINTURAS Y PRODUCTOS QUÍMICOS'),
 ('actividades-cuentas','SELLANTES CARPINTERÍA'),
 ('actividades-cuentas','SOFTWARE INFORMATICA VIDRIO'),
 ('actividades-cuentas','LÁMINAS PROTECCIÓN SOLAR'),
 ('actividades-cuentas','MAQUINARIA CARPINTERÍA DISTRIBUIDORES'),
 ('actividades-cuentas','MAQUINARIA Y HERRAMIENTAS CARPINTERÍA FABRICANTES'),
 ('actividades-cuentas','OTRAS ACTIVIDADES'),
 ('actividades-cuentas','SECTOR CRISTAL Y ENVASE'),
 ('actividades-cuentas','DECORACIÓN E INTERIORISMO'),
 ('actividades-cuentas','FABRICANTE VIDRIO PLANO FLOAT'),
 ('actividades-cuentas','COMPONENTES PARA INDUSTRIA DEL VIDRIO'),
 ('actividades-cuentas','VIDRIO TEMPLADO'),
 ('actividades-cuentas','DOBLE ACRISTALAMIENTO'),
 ('actividades-cuentas','IMPRESIÓN DIGITAL SOBRE VIDRIO'),
 ('actividades-cuentas','VIDRIO CURVADO'),
 ('tipos-contacto','DECISOR PRINCIPAL'),
 ('tipos-contacto','CONTACTO PRINCIPAL'),
 ('tipos-contacto','AYUDANTE MARKETING'),
 ('tipos-contacto','VIP'),
 ('tipos-contacto','AGENCIA'),
 ('tipos-contacto','AGENCIA SOLO PRENSA'),
 ('tipos-contacto','LINKEDIN'),
 ('tipos-contacto','PENDIENTE DE ACTUALIZAR'),
 ('tipos-contacto','NO RECIBE'),
 ('tipos-contacto','REVISTA IMPRESA ENVIAR'),
 ('tipos-contacto','OTROS CONTACTOS'),
 ('tipos-contacto','Administración - Contabilidad')
ON CONFLICT DO NOTHING;
WITH labels AS (
 SELECT id_cuenta,btrim(value) nombre FROM comercial_cuentas CROSS JOIN LATERAL string_to_table(actividades_cuenta,'|##|') value
)
INSERT INTO operaciones_clasificaciones(clase,nombre)
SELECT DISTINCT 'actividades-cuentas',nombre FROM labels WHERE length(nombre) BETWEEN 1 AND 200
ON CONFLICT DO NOTHING;
INSERT INTO comercial_cuenta_actividades(id_cuenta,id_clasificacion)
SELECT a.id_cuenta,c.id FROM comercial_cuentas a CROSS JOIN LATERAL string_to_table(a.actividades_cuenta,'|##|') value
JOIN operaciones_clasificaciones c ON c.clase='actividades-cuentas' AND lower(regexp_replace(btrim(c.nombre),'\s+',' ','g'))=lower(regexp_replace(btrim(value),'\s+',' ','g'))
ON CONFLICT DO NOTHING;
WITH labels AS (
 SELECT btrim(value) nombre FROM comercial_contactos CROSS JOIN LATERAL string_to_table(tipo_contacto,'|##|') value
)
INSERT INTO operaciones_clasificaciones(clase,nombre)
SELECT DISTINCT 'tipos-contacto',nombre FROM labels WHERE length(nombre) BETWEEN 1 AND 200
ON CONFLICT DO NOTHING;
INSERT INTO comercial_contacto_tipos(id_contacto,id_clasificacion)
SELECT a.id_contacto,c.id FROM comercial_contactos a CROSS JOIN LATERAL string_to_table(a.tipo_contacto,'|##|') value
JOIN operaciones_clasificaciones c ON c.clase='tipos-contacto' AND lower(regexp_replace(btrim(c.nombre),'\s+',' ','g'))=lower(regexp_replace(btrim(value),'\s+',' ','g'))
ON CONFLICT DO NOTHING;
WITH inputs AS (
 SELECT id_cuenta,
 coalesce(nullif(btrim(datos_comerciales#>>'{actualizacion_vtiger_20261109,datos_originales,QUIEN ES QUIEN}'),''),btrim(datos_comerciales#>>'{importacion_csv,datos_originales,QUIEN ES QUIEN}'),'') qq_value,
 coalesce(nullif(btrim(datos_comerciales#>>'{actualizacion_vtiger_20261109,datos_originales,VIDEO}'),''),btrim(datos_comerciales#>>'{importacion_csv,datos_originales,VIDEO}'),'') video,
 jsonb_strip_nulls(jsonb_build_object(
 'articulos_espana',coalesce(nullif(datos_comerciales#>>'{actualizacion_vtiger_20261109,datos_originales,Dirección-Contacto artículos ESPAÑA}',''),nullif(datos_comerciales#>>'{importacion_csv,datos_originales,Dirección-Contacto artículos ESPAÑA}','')),
 'articulos_latam',coalesce(nullif(datos_comerciales#>>'{actualizacion_vtiger_20261109,datos_originales,Dirección-Contacto artículos LATAM}',''),nullif(datos_comerciales#>>'{importacion_csv,datos_originales,Dirección-Contacto artículos LATAM}',''))
 )) articulos
 FROM comercial_cuentas
)
UPDATE comercial_cuentas c
SET seguimiento_qq=CASE WHEN upper(i.qq_value) IN ('OKQQ','OKQQ LATAM','OK QQ ESPAÑA Y LATAM','AÑADIRQQ','CAMBIARQQ','QUITARQQ') THEN upper(i.qq_value)
 WHEN c.qq OR c.presente_en_qq THEN 'OKQQ' ELSE '' END,
 canal_youtube=CASE WHEN i.video ~* '^https?://([a-z0-9-]+\.)?youtube\.com/' THEN i.video ELSE '' END,
 datos_comerciales=CASE WHEN i.articulos <> '{}' THEN jsonb_set(coalesce(c.datos_comerciales,'{}'),'{segmentacion_produccion}',i.articulos || coalesce(c.datos_comerciales->'segmentacion_produccion','{}')) ELSE c.datos_comerciales END
FROM inputs i WHERE c.id_cuenta=i.id_cuenta AND (c.qq OR c.presente_en_qq OR i.qq_value<>'' OR i.video ~* '^https?://([a-z0-9-]+\.)?youtube\.com/' OR i.articulos<>'{}');
