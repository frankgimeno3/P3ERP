-- Rename the 66 public tables to their domain names. Run after deploying compatible code.
BEGIN;
SET LOCAL lock_timeout = '10s';
COMMENT ON TABLE public."agentes_db" IS 'Agentes y usuarios de la aplicación, con datos de acceso y perfil.';
ALTER TABLE public."roles_db" RENAME TO "agentes_roles";
COMMENT ON TABLE public."agentes_roles" IS 'Roles y permisos asignables a los agentes.';
ALTER TABLE public."cuentas_db" RENAME TO "comercial_cuentas";
COMMENT ON TABLE public."comercial_cuentas" IS 'Empresas y cuentas comerciales, incluidos sus datos de facturación.';
ALTER TABLE public."contactos_db" RENAME TO "comercial_contactos";
COMMENT ON TABLE public."comercial_contactos" IS 'Personas de contacto vinculadas a las cuentas comerciales.';
ALTER TABLE public."propuestas_db" RENAME TO "comercial_propuestas_db";
COMMENT ON TABLE public."comercial_propuestas_db" IS 'Cabeceras y estado de las propuestas comerciales.';
ALTER TABLE public."lineas_propuestas_db" RENAME TO "comercial_propuestas_lineas";
COMMENT ON TABLE public."comercial_propuestas_lineas" IS 'Servicios, cantidades y precios ofertados en cada propuesta.';
ALTER TABLE public."cobros_propuestas_db" RENAME TO "comercial_propuestas_cobros";
COMMENT ON TABLE public."comercial_propuestas_cobros" IS 'Plan de cobros ofrecido en cada propuesta.';
ALTER TABLE public."contratos_db" RENAME TO "comercial_contratos";
COMMENT ON TABLE public."comercial_contratos" IS 'Acuerdos comerciales aceptados o creados directamente.';
ALTER TABLE public."lineas_contratos_db" RENAME TO "comercial_contratos_lineas";
COMMENT ON TABLE public."comercial_contratos_lineas" IS 'Servicios y condiciones pactados en cada contrato.';
ALTER TABLE public."cobros_contratos_db" RENAME TO "comercial_contratos_cobros";
COMMENT ON TABLE public."comercial_contratos_cobros" IS 'Plan de cobros pactado para cada contrato.';
ALTER TABLE public."suscripciones_db" RENAME TO "comercial_suscripciones";
COMMENT ON TABLE public."comercial_suscripciones" IS 'Suscripciones asociadas a cuentas, propuestas y contratos.';
ALTER TABLE public."ferias_db" RENAME TO "administracion_ferias";
COMMENT ON TABLE public."administracion_ferias" IS 'Ferias y ediciones gestionadas por la empresa.';
ALTER TABLE public."ordenes_db" RENAME TO "tesoreria_ordenes";
COMMENT ON TABLE public."tesoreria_ordenes" IS 'Órdenes de cobro con vencimiento, importe y estado real de pago.';
ALTER TABLE public."ingresos_adicionales_db" RENAME TO "tesoreria_ingresos_adicionales";
COMMENT ON TABLE public."tesoreria_ingresos_adicionales" IS 'Ingresos previstos que no proceden de un contrato.';
ALTER TABLE public."prevision_recibos_excel" RENAME TO "tesoreria_recibos_importados";
COMMENT ON TABLE public."tesoreria_recibos_importados" IS 'Recibos importados de Excel y vinculados a órdenes y remesas.';
ALTER TABLE public."remesas_db" RENAME TO "tesoreria_remesas";
COMMENT ON TABLE public."tesoreria_remesas" IS 'Agrupaciones de recibos para su seguimiento y conciliación.';
ALTER TABLE public."lineas_bancos" RENAME TO "tesoreria_movimientos_bancarios";
COMMENT ON TABLE public."tesoreria_movimientos_bancarios" IS 'Movimientos importados de los extractos bancarios.';
ALTER TABLE public."banco_cobros_ordenes" RENAME TO "tesoreria_aplicaciones_cobro";
COMMENT ON TABLE public."tesoreria_aplicaciones_cobro" IS 'Aplicación de movimientos bancarios a órdenes de cobro.';
ALTER TABLE public."cargos_recurrentes" RENAME TO "tesoreria_cargos_recurrentes";
COMMENT ON TABLE public."tesoreria_cargos_recurrentes" IS 'Reglas de previsión de cargos periódicos de proveedores y nóminas.';
ALTER TABLE public."pagos_db" RENAME TO "tesoreria_pagos_previstos";
COMMENT ON TABLE public."tesoreria_pagos_previstos" IS 'Pagos previstos y su planificación financiera.';
ALTER TABLE public."tarjetas" RENAME TO "tesoreria_tarjetas";
COMMENT ON TABLE public."tesoreria_tarjetas" IS 'Tarjetas utilizadas para registrar gastos y tickets.';
ALTER TABLE public."registros_bancarios_db" RENAME TO "tesoreria_registros_bancarios";
COMMENT ON TABLE public."tesoreria_registros_bancarios" IS 'Registro bancario heredado; revisar su uso antes de añadir datos.';
ALTER TABLE public."facturas_clientes_db" RENAME TO "administracion_facturas_clientes";
COMMENT ON TABLE public."administracion_facturas_clientes" IS 'Facturas emitidas a clientes y sus datos fiscales y de cobro.';
ALTER TABLE public."lineas_facturas_db" RENAME TO "administracion_lineas_factura";
COMMENT ON TABLE public."administracion_lineas_factura" IS 'Conceptos e importes de las facturas de clientes.';
ALTER TABLE public."proveedores_db" RENAME TO "administracion_proveedores";
COMMENT ON TABLE public."administracion_proveedores" IS 'Ficha maestra de proveedores.';
ALTER TABLE public."proveedores_unificados" RENAME TO "administracion_historial_fusiones_proveedores";
COMMENT ON TABLE public."administracion_historial_fusiones_proveedores" IS 'Historial y correspondencias de proveedores fusionados.';
ALTER TABLE public."proveedores_benchmark" RENAME TO "administracion_benchmark_proveedores";
COMMENT ON TABLE public."administracion_benchmark_proveedores" IS 'Comparativa de servicios y precios de proveedores.';
ALTER TABLE public."precios_proveedores" RENAME TO "administracion_precios_proveedor";
COMMENT ON TABLE public."administracion_precios_proveedor" IS 'Precios registrados para productos o servicios de un proveedor.';
ALTER TABLE public."facturas_proveedores_db" RENAME TO "administracion_facturas_proveedores";
COMMENT ON TABLE public."administracion_facturas_proveedores" IS 'Facturas recibidas de proveedores.';
ALTER TABLE public."tickets_db" RENAME TO "administracion_tickets";
COMMENT ON TABLE public."administracion_tickets" IS 'Gastos documentados mediante tickets y sus archivos.';
ALTER TABLE public."grupos_servicios" RENAME TO "servicios_grupos_servicios";
COMMENT ON TABLE public."servicios_grupos_servicios" IS 'Grupos o medios utilizados para organizar el catálogo de servicios.';
COMMENT ON TABLE public."servicios_db" IS 'Catálogo de servicios, soportes, publicaciones y precios.';
ALTER TABLE public."tarifas_db" RENAME TO "servicios_tarifas";
COMMENT ON TABLE public."servicios_tarifas" IS 'Documentos y versiones de tarifas comerciales.';
ALTER TABLE public."paginas_tarifas" RENAME TO "servicios_paginas_tarifa";
COMMENT ON TABLE public."servicios_paginas_tarifa" IS 'Páginas de tarifa y servicios incluidos en cada una.';
ALTER TABLE public."revistas_db" RENAME TO "servicios_revistas";
COMMENT ON TABLE public."servicios_revistas" IS 'Cabeceras de revistas y sus características.';
ALTER TABLE public."revistas_paginas_db" RENAME TO "servicios_paginas_revista";
COMMENT ON TABLE public."servicios_paginas_revista" IS 'Páginas y preferencias de ubicación en revistas.';
ALTER TABLE public."newsleters_db" RENAME TO "servicios_newsletters";
COMMENT ON TABLE public."servicios_newsletters" IS 'Cabeceras y ediciones de newsletters.';
ALTER TABLE public."publicaciones_db" RENAME TO "servicios_publicaciones";
COMMENT ON TABLE public."servicios_publicaciones" IS 'Ediciones y publicaciones concretas de los soportes editoriales.';
ALTER TABLE public."contenidos_db" RENAME TO "produccion_contenidos";
COMMENT ON TABLE public."produccion_contenidos" IS 'Entregables y contenidos asociados a publicaciones y contratos.';
ALTER TABLE public."control_redaccion_db" RENAME TO "produccion_control_redaccion";
COMMENT ON TABLE public."produccion_control_redaccion" IS 'Seguimiento del trabajo editorial y de sus publicaciones previstas.';
ALTER TABLE public."materiales_db" RENAME TO "produccion_materiales";
COMMENT ON TABLE public."produccion_materiales" IS 'Materiales de producción vinculados a contenidos y cuentas.';
ALTER TABLE public."comentarios_db" RENAME TO "general_comentarios";
COMMENT ON TABLE public."general_comentarios" IS 'Comentarios asociados a entidades del ERP.';
ALTER TABLE public."registro_eventos" RENAME TO "general_eventos";
COMMENT ON TABLE public."general_eventos" IS 'Historial de acciones en cuentas y contactos.';
ALTER TABLE public."seguimientos_db" RENAME TO "actividad_seguimientos";
COMMENT ON TABLE public."actividad_seguimientos" IS 'Seguimientos generales asignados a agentes.';
ALTER TABLE public."agentes_tareas" RENAME TO "laboral_tareas_empleado";
COMMENT ON TABLE public."laboral_tareas_empleado" IS 'Tareas internas asignadas a empleados o agentes.';
ALTER TABLE public."anticipos_empleados" RENAME TO "laboral_anticipos";
COMMENT ON TABLE public."laboral_anticipos" IS 'Anticipos salariales de empleados.';
ALTER TABLE public."ausencias_empleados" RENAME TO "laboral_ausencias";
COMMENT ON TABLE public."laboral_ausencias" IS 'Ausencias y períodos de ausencia de empleados.';
ALTER TABLE public."calendarios_laborales" RENAME TO "laboral_calendarios";
COMMENT ON TABLE public."laboral_calendarios" IS 'Años del calendario laboral.';
ALTER TABLE public."candidatos_contratacion" RENAME TO "laboral_candidatos";
COMMENT ON TABLE public."laboral_candidatos" IS 'Candidaturas asociadas a procesos de contratación.';
ALTER TABLE public."comentarios_empleados" RENAME TO "laboral_comentarios_empleados";
COMMENT ON TABLE public."laboral_comentarios_empleados" IS 'Comentarios internos de la ficha laboral del empleado.';
ALTER TABLE public."documentos_laborales" RENAME TO "laboral_documentos";
COMMENT ON TABLE public."laboral_documentos" IS 'Documentos laborales, nóminas y anticipos almacenados.';
ALTER TABLE public."empleados_libre_disposicion" RENAME TO "laboral_dias_libre_disposicion";
COMMENT ON TABLE public."laboral_dias_libre_disposicion" IS 'Días de libre disposición asignados a empleados.';
ALTER TABLE public."eventos_calendario_laboral" RENAME TO "laboral_eventos_calendario";
COMMENT ON TABLE public."laboral_eventos_calendario" IS 'Festivos y otros eventos del calendario laboral.';
ALTER TABLE public."horas_juan" RENAME TO "laboral_horas_colaboradores";
COMMENT ON TABLE public."laboral_horas_colaboradores" IS 'Horas, anticipos y liquidaciones de colaboradores.';
ALTER TABLE public."nominas" RENAME TO "laboral_nominas";
COMMENT ON TABLE public."laboral_nominas" IS 'Nóminas mensuales y estado de sus transferencias.';
ALTER TABLE public."nominas_empleados" RENAME TO "laboral_empleados_en_nomina";
COMMENT ON TABLE public."laboral_empleados_en_nomina" IS 'Empleados inscritos en el seguimiento de nómina recurrente.';
ALTER TABLE public."procesos_contratacion" RENAME TO "laboral_procesos_seleccion";
COMMENT ON TABLE public."laboral_procesos_seleccion" IS 'Procesos de selección y sus comunicaciones preparadas.';
ALTER TABLE public."mediateca_contents" RENAME TO "mediateca_archivos";
COMMENT ON TABLE public."mediateca_archivos" IS 'Archivos y metadatos almacenados en la mediateca.';
ALTER TABLE public."mediateca_folders" RENAME TO "mediateca_carpetas";
COMMENT ON TABLE public."mediateca_carpetas" IS 'Carpetas jerárquicas de la mediateca.';
ALTER TABLE public."verifactu_counters" RENAME TO "fiscal_verifactu_contadores";
COMMENT ON TABLE public."fiscal_verifactu_contadores" IS 'Contadores de numeración fiscal de VERI*FACTU.';
ALTER TABLE public."verifactu_installations" RENAME TO "fiscal_verifactu_instalaciones";
COMMENT ON TABLE public."fiscal_verifactu_instalaciones" IS 'Instalaciones y declaraciones responsables de VERI*FACTU.';
ALTER TABLE public."verifactu_jobs" RENAME TO "fiscal_verifactu_trabajos";
COMMENT ON TABLE public."fiscal_verifactu_trabajos" IS 'Trabajos de procesamiento de registros VERI*FACTU.';
ALTER TABLE public."verifactu_outbox" RENAME TO "fiscal_verifactu_envios";
COMMENT ON TABLE public."fiscal_verifactu_envios" IS 'Cola de envío de registros fiscales a AEAT.';
ALTER TABLE public."verifactu_records" RENAME TO "fiscal_verifactu_registros";
COMMENT ON TABLE public."fiscal_verifactu_registros" IS 'Registros fiscales inmutables de facturas emitidas.';
ALTER TABLE public."historial_actualizaciones_tiger" RENAME TO "general_tiger_actualizaciones";
COMMENT ON TABLE public."general_tiger_actualizaciones" IS 'Historial de importaciones y actualizaciones desde Tiger.';
ALTER TABLE public."registro_copias_seguridad" RENAME TO "general_copias_seguridad";
COMMENT ON TABLE public."general_copias_seguridad" IS 'Registro de copias de seguridad generadas.';
-- registrar_nomina_empleado
CREATE OR REPLACE FUNCTION public.registrar_nomina_empleado()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.tipo_cargo = 'nomina' AND NEW.id_agente IS NOT NULL THEN
    INSERT INTO laboral_empleados_en_nomina(id,id_empleado)
    VALUES ('nomina_emp_' || md5(NEW.id_agente), NEW.id_agente)
    ON CONFLICT(id_empleado) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$
;

-- registrar_nomina_historica
CREATE OR REPLACE FUNCTION public.registrar_nomina_historica()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO laboral_empleados_en_nomina(id,id_empleado)
  VALUES ('nomina_emp_' || md5(NEW.id_empleado),NEW.id_empleado)
  ON CONFLICT(id_empleado) DO NOTHING;
  RETURN NEW;
END;
$function$
;

-- protect_emitted_invoice_lines
CREATE OR REPLACE FUNCTION public.protect_emitted_invoice_lines()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  target_invoice_id TEXT;
  target_status TEXT;
BEGIN
  target_invoice_id := COALESCE(NEW.id_factura_cliente, OLD.id_factura_cliente);
  SELECT verifactu_estado_envio INTO target_status
  FROM administracion_facturas_clientes WHERE id_factura_cliente = target_invoice_id;
  IF target_status = 'factura emitida' THEN
    RAISE EXCEPTION 'Las líneas de una factura emitida son inmutables';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

-- validate_proposal_acceptance_integrity
CREATE OR REPLACE FUNCTION public.validate_proposal_acceptance_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF lower(COALESCE(NEW.estado_propuesta, '')) IN ('aceptada', 'aprobada')
     AND lower(COALESCE(OLD.estado_propuesta, '')) NOT IN ('aceptada', 'aprobada') THEN
    IF NOT EXISTS (SELECT 1 FROM comercial_propuestas_lineas WHERE id_propuesta = NEW.id_propuesta) THEN
      RAISE EXCEPTION 'La propuesta % no puede aceptarse porque no tiene líneas de servicio', NEW.id_propuesta;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM comercial_propuestas_cobros WHERE id_propuesta = NEW.id_propuesta) THEN
      RAISE EXCEPTION 'La propuesta % no puede aceptarse porque no tiene cobros definidos', NEW.id_propuesta;
    END IF;
    IF EXISTS (
      SELECT 1
      FROM comercial_propuestas_cobros
      WHERE id_propuesta = NEW.id_propuesta
        AND (fecha_cobro IS NULL OR btrim(fecha_cobro) = '' OR importe_cobro IS NULL OR importe_cobro <= 0)
    ) THEN
      RAISE EXCEPTION 'La propuesta % no puede aceptarse porque tiene cobros incompletos', NEW.id_propuesta;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

-- registro_eventos_compat_write
CREATE OR REPLACE FUNCTION public.registro_eventos_compat_write()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE entity_type text;
DECLARE entity_id text;
BEGIN
  entity_type := CASE WHEN TG_TABLE_NAME='cuentas_registro_eventos' THEN 'cuenta' ELSE 'contacto' END;
  IF TG_OP='DELETE' THEN
    DELETE FROM general_eventos WHERE id=OLD.id AND tipo_entidad=entity_type;
    RETURN OLD;
  END IF;
  entity_id := CASE WHEN entity_type='cuenta' THEN to_jsonb(NEW)->>'id_cuenta' ELSE to_jsonb(NEW)->>'id_contacto' END;
  IF TG_OP='INSERT' THEN
    INSERT INTO general_eventos(id,created_at,event_type,id_agente,tipo_entidad,id_entidad,detalles)
    VALUES(NEW.id,COALESCE(NEW.created_at,now()),NEW.event_type,COALESCE(NEW.id_agente,''),entity_type,entity_id,COALESCE(NEW.detalles,''));
  ELSE
    UPDATE general_eventos SET created_at=NEW.created_at,event_type=NEW.event_type,
      id_agente=NEW.id_agente,id_entidad=entity_id,detalles=NEW.detalles
    WHERE id=OLD.id AND tipo_entidad=entity_type;
  END IF;
  RETURN NEW;
END $function$
;
COMMIT;
