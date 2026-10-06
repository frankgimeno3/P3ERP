CREATE TABLE IF NOT EXISTS comercial_cuenta_tareas (
  id text PRIMARY KEY,
  id_cuenta text NOT NULL REFERENCES comercial_cuentas(id_cuenta) ON DELETE RESTRICT,
  nombre text NOT NULL CHECK (length(btrim(nombre)) BETWEEN 1 AND 250),
  tipo text NOT NULL CHECK (tipo IN ('pedir_material_contratado','pedir_material_campana','recordar_material','enviar_publicado_contratado','enviar_publicado_gratuito','propuesta_renovacion','propuesta_publicitaria','llamada','email','accion')),
  descripcion text NOT NULL DEFAULT '',
  referencia text NOT NULL DEFAULT '',
  fecha_limite date,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_curso','completada','cancelada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cuenta_tareas_cuenta_idx ON comercial_cuenta_tareas(id_cuenta,estado);
CREATE TABLE IF NOT EXISTS comercial_cuenta_tarea_agentes (
  id_tarea text NOT NULL REFERENCES comercial_cuenta_tareas(id) ON DELETE CASCADE,
  id_agente text NOT NULL REFERENCES agentes_db(id_agente) ON DELETE RESTRICT,
  PRIMARY KEY (id_tarea,id_agente)
);
CREATE INDEX IF NOT EXISTS cuenta_tarea_agentes_agente_idx ON comercial_cuenta_tarea_agentes(id_agente,id_tarea);

CREATE OR REPLACE FUNCTION p3_account_task_assigned() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE task_id text;
BEGIN
  IF TG_TABLE_NAME='comercial_cuenta_tareas' THEN task_id:=COALESCE(NEW.id,OLD.id);
  ELSE task_id:=COALESCE(NEW.id_tarea,OLD.id_tarea); END IF;
  IF EXISTS(SELECT 1 FROM comercial_cuenta_tareas WHERE id=task_id)
    AND NOT EXISTS(SELECT 1 FROM comercial_cuenta_tarea_agentes WHERE id_tarea=task_id) THEN
    RAISE EXCEPTION 'La tarea necesita al menos un agente.' USING ERRCODE='23514';
  END IF;
  IF TG_TABLE_NAME='comercial_cuenta_tarea_agentes' AND TG_OP='UPDATE' THEN
    IF OLD.id_tarea IS DISTINCT FROM NEW.id_tarea
      AND EXISTS(SELECT 1 FROM comercial_cuenta_tareas WHERE id=OLD.id_tarea)
      AND NOT EXISTS(SELECT 1 FROM comercial_cuenta_tarea_agentes WHERE id_tarea=OLD.id_tarea) THEN
      RAISE EXCEPTION 'La tarea necesita al menos un agente.' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS account_task_requires_agent ON comercial_cuenta_tareas;
CREATE CONSTRAINT TRIGGER account_task_requires_agent AFTER INSERT OR UPDATE ON comercial_cuenta_tareas
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION p3_account_task_assigned();
DROP TRIGGER IF EXISTS account_task_retains_agent ON comercial_cuenta_tarea_agentes;
CREATE CONSTRAINT TRIGGER account_task_retains_agent AFTER DELETE OR UPDATE ON comercial_cuenta_tarea_agentes
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION p3_account_task_assigned();
