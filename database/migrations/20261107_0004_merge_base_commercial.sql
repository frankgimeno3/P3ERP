SELECT public.p3_install_user_event_triggers();
CREATE OR REPLACE FUNCTION p3_canonical_agent_role() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF lower(btrim(NEW.rol_agente))='comercial' THEN NEW.rol_agente='base'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS p3_canonical_agent_role ON agentes_db;
CREATE TRIGGER p3_canonical_agent_role BEFORE INSERT OR UPDATE OF rol_agente ON agentes_db FOR EACH ROW EXECUTE FUNCTION p3_canonical_agent_role();
UPDATE agentes_roles b SET
 permisos_rol=(SELECT coalesce(jsonb_agg(value ORDER BY value),'[]'::jsonb) FROM (SELECT DISTINCT jsonb_array_elements_text(coalesce(r.permisos_rol,'[]'::jsonb)) AS value FROM agentes_roles r WHERE id_rol IN ('base','comercial')) merged),
 array_accesos_adicionales=(SELECT coalesce(jsonb_agg(value ORDER BY value),'[]'::jsonb) FROM (SELECT DISTINCT jsonb_array_elements_text(coalesce(r.array_accesos_adicionales,'[]'::jsonb)) AS value FROM agentes_roles r WHERE id_rol IN ('base','comercial')) merged),
 accesos_personalizados=EXISTS(SELECT 1 FROM agentes_roles r WHERE id_rol IN ('base','comercial') AND r.accesos_personalizados),
 nombre_rol='Base',descripcion_rol='Comercial y Producción. Incluye las funciones del antiguo rol Comercial: gestión comercial, responsables de cuentas, propuestas y contratos y tareas de cuentas.',updated_at=clock_timestamp()
 WHERE b.id_rol='base';
UPDATE agentes_db SET rol_agente='base',updated_at=clock_timestamp() WHERE lower(btrim(rol_agente))='comercial';
DELETE FROM agentes_roles WHERE id_rol='comercial';
