BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS comercial_campanas (
  id text PRIMARY KEY,
  nombre text NOT NULL CHECK (length(btrim(nombre)) BETWEEN 1 AND 250),
  descripcion text NOT NULL DEFAULT '',
  fecha_finalizacion date,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_curso','finalizada')),
  creada_por text NOT NULL REFERENCES agentes_db(id_agente),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS comercial_campana_agentes (
  id_campana text REFERENCES comercial_campanas(id) ON DELETE CASCADE,
  id_agente text REFERENCES agentes_db(id_agente) ON DELETE CASCADE,
  PRIMARY KEY (id_campana,id_agente)
);
CREATE TABLE IF NOT EXISTS comercial_campana_cuentas (
  id_campana text REFERENCES comercial_campanas(id) ON DELETE CASCADE,
  id_cuenta text REFERENCES comercial_cuentas(id_cuenta) ON UPDATE CASCADE ON DELETE CASCADE,
  PRIMARY KEY (id_campana,id_cuenta)
);
CREATE INDEX IF NOT EXISTS comercial_campana_cuentas_by_account ON comercial_campana_cuentas(id_cuenta,id_campana);
ALTER TABLE comercial_cuenta_tareas
  ADD COLUMN IF NOT EXISTS id_campana text REFERENCES comercial_campanas(id) ON DELETE SET NULL;
ALTER TABLE laboral_tareas_empleado
  ADD COLUMN IF NOT EXISTS id_campana text REFERENCES comercial_campanas(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS comercial_cuenta_tareas_by_campaign ON comercial_cuenta_tareas(id_campana) WHERE id_campana IS NOT NULL;
CREATE INDEX IF NOT EXISTS laboral_tareas_empleado_by_campaign ON laboral_tareas_empleado(id_campana) WHERE id_campana IS NOT NULL;
ALTER TABLE comercial_cuentas ADD COLUMN IF NOT EXISTS stands_ferias_ediciones jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(stands_ferias_ediciones) = 'array');

SELECT public.p3_install_user_event_triggers();
COMMIT;
