CREATE TABLE IF NOT EXISTS comercial_campana_tareas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_campana text NOT NULL REFERENCES comercial_campanas(id) ON DELETE CASCADE,
  id_tarea_cuenta text REFERENCES comercial_cuenta_tareas(id) ON DELETE CASCADE,
  id_tarea_empleado text REFERENCES laboral_tareas_empleado(id) ON DELETE CASCADE,
  CONSTRAINT comercial_campana_tareas_one_task CHECK (num_nonnulls(id_tarea_cuenta,id_tarea_empleado)=1),
  UNIQUE (id_tarea_cuenta,id_campana),
  UNIQUE (id_tarea_empleado,id_campana)
);
CREATE INDEX IF NOT EXISTS comercial_campana_tareas_campaign_idx ON comercial_campana_tareas(id_campana);
SELECT public.p3_install_user_event_triggers();
