BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.comercial_cuentas ADD COLUMN IF NOT EXISTS renovacion_anual jsonb;
ALTER TABLE public.comercial_cuenta_tareas
  ADD COLUMN IF NOT EXISTS es_renovacion_anual boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS cuenta_tarea_renovacion_anual_idx
  ON public.comercial_cuenta_tareas (id_cuenta) WHERE es_renovacion_anual;

CREATE OR REPLACE FUNCTION public.p3_check_account_task_agents(task_id text) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE
  annual boolean;
  agent_count integer;
BEGIN
  SELECT es_renovacion_anual INTO annual FROM public.comercial_cuenta_tareas WHERE id = task_id FOR NO KEY UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT count(*) INTO agent_count FROM public.comercial_cuenta_tarea_agentes WHERE id_tarea = task_id;
  IF (annual AND agent_count > 1) OR (NOT annual AND agent_count = 0) THEN
    RAISE EXCEPTION 'Número de agentes no válido para la tarea.' USING ERRCODE = '23514';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.p3_account_task_assigned() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'comercial_cuenta_tareas' THEN
    PERFORM public.p3_check_account_task_agents(NEW.id);
  ELSE
    IF TG_OP <> 'DELETE' THEN
      PERFORM public.p3_check_account_task_agents(NEW.id_tarea);
    END IF;
    IF TG_OP <> 'INSERT' THEN
      PERFORM public.p3_check_account_task_agents(OLD.id_tarea);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

-- The agent relation also needs validation when an assignment is inserted.
DROP TRIGGER IF EXISTS account_task_retains_agent ON public.comercial_cuenta_tarea_agentes;
CREATE CONSTRAINT TRIGGER account_task_retains_agent AFTER INSERT OR UPDATE OR DELETE
  ON public.comercial_cuenta_tarea_agentes DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.p3_account_task_assigned();

CREATE OR REPLACE FUNCTION public.p3_delete_account_annual_renewal() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.comercial_cuenta_tareas WHERE id_cuenta = OLD.id_cuenta AND es_renovacion_anual;
  RETURN OLD;
END;
$$;
DROP TRIGGER IF EXISTS account_delete_annual_renewal ON public.comercial_cuentas;
CREATE TRIGGER account_delete_annual_renewal BEFORE DELETE ON public.comercial_cuentas
  FOR EACH ROW EXECUTE FUNCTION public.p3_delete_account_annual_renewal();

COMMIT;
