BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT id,created_at,event_type,id_agente,'cuenta'::text AS tipo_entidad,id_cuenta AS id_entidad,detalles
    FROM cuentas_registro_eventos_historico
    EXCEPT
    SELECT id,created_at,event_type,id_agente,tipo_entidad,id_entidad,detalles
    FROM registro_eventos
  ) OR EXISTS (
    SELECT id,created_at,event_type,id_agente,'contacto'::text AS tipo_entidad,id_contacto AS id_entidad,detalles
    FROM contactos_registro_eventos_historico
    EXCEPT
    SELECT id,created_at,event_type,id_agente,tipo_entidad,id_entidad,detalles
    FROM registro_eventos
  ) THEN
    RAISE EXCEPTION 'Hay eventos sin migrar; no se eliminan las tablas anteriores';
  END IF;
END $$;

DROP TABLE cuentas_registro_eventos_historico;
DROP TABLE contactos_registro_eventos_historico;

COMMIT;
