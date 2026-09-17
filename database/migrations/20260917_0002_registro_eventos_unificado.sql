BEGIN;

CREATE TABLE registro_eventos (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  id_agente text NOT NULL DEFAULT '',
  tipo_entidad text NOT NULL CHECK (tipo_entidad IN ('cuenta', 'contacto')),
  id_entidad text NOT NULL,
  detalles text NOT NULL DEFAULT ''
);
CREATE INDEX registro_eventos_entidad_idx ON registro_eventos(tipo_entidad, id_entidad, created_at DESC);

INSERT INTO registro_eventos(id,created_at,event_type,id_agente,tipo_entidad,id_entidad,detalles)
SELECT id,created_at,event_type,id_agente,'cuenta',id_cuenta,detalles FROM cuentas_registro_eventos
UNION ALL
SELECT id,created_at,event_type,id_agente,'contacto',id_contacto,detalles FROM contactos_registro_eventos;

DROP VIEW comentarios_registro_eventos;
ALTER TABLE cuentas_registro_eventos RENAME TO cuentas_registro_eventos_historico;
ALTER TABLE contactos_registro_eventos RENAME TO contactos_registro_eventos_historico;

CREATE VIEW cuentas_registro_eventos AS
SELECT id,created_at,event_type,id_agente,id_entidad AS id_cuenta,detalles
FROM registro_eventos WHERE tipo_entidad='cuenta';
CREATE VIEW contactos_registro_eventos AS
SELECT id,created_at,event_type,id_agente,id_entidad AS id_contacto,detalles
FROM registro_eventos WHERE tipo_entidad='contacto';
CREATE VIEW comentarios_registro_eventos AS SELECT * FROM contactos_registro_eventos;

CREATE FUNCTION registro_eventos_compat_write() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE entity_type text;
DECLARE entity_id text;
BEGIN
  entity_type := CASE WHEN TG_TABLE_NAME='cuentas_registro_eventos' THEN 'cuenta' ELSE 'contacto' END;
  IF TG_OP='DELETE' THEN
    DELETE FROM registro_eventos WHERE id=OLD.id AND tipo_entidad=entity_type;
    RETURN OLD;
  END IF;
  entity_id := CASE WHEN entity_type='cuenta' THEN to_jsonb(NEW)->>'id_cuenta' ELSE to_jsonb(NEW)->>'id_contacto' END;
  IF TG_OP='INSERT' THEN
    INSERT INTO registro_eventos(id,created_at,event_type,id_agente,tipo_entidad,id_entidad,detalles)
    VALUES(NEW.id,COALESCE(NEW.created_at,now()),NEW.event_type,COALESCE(NEW.id_agente,''),entity_type,entity_id,COALESCE(NEW.detalles,''));
  ELSE
    UPDATE registro_eventos SET created_at=NEW.created_at,event_type=NEW.event_type,
      id_agente=NEW.id_agente,id_entidad=entity_id,detalles=NEW.detalles
    WHERE id=OLD.id AND tipo_entidad=entity_type;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER cuentas_registro_eventos_compat_write
INSTEAD OF INSERT OR UPDATE OR DELETE ON cuentas_registro_eventos
FOR EACH ROW EXECUTE FUNCTION registro_eventos_compat_write();
CREATE TRIGGER contactos_registro_eventos_compat_write
INSTEAD OF INSERT OR UPDATE OR DELETE ON contactos_registro_eventos
FOR EACH ROW EXECUTE FUNCTION registro_eventos_compat_write();
CREATE TRIGGER comentarios_registro_eventos_compat_write
INSTEAD OF INSERT OR UPDATE OR DELETE ON comentarios_registro_eventos
FOR EACH ROW EXECUTE FUNCTION registro_eventos_compat_write();

COMMIT;
