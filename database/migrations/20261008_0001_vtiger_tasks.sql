-- Extend the existing task storage; no additional database or task table.
ALTER TABLE laboral_tareas_empleado ALTER COLUMN agente DROP NOT NULL;
ALTER TABLE laboral_tareas_empleado
  ADD COLUMN IF NOT EXISTS id_cuenta text REFERENCES comercial_cuentas(id_cuenta) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fecha_inicio timestamp without time zone,
  ADD COLUMN IF NOT EXISTS fecha_fin timestamp without time zone,
  ADD COLUMN IF NOT EXISTS vtiger_original jsonb,
  ADD COLUMN IF NOT EXISTS importacion_clave text;
CREATE UNIQUE INDEX IF NOT EXISTS laboral_tareas_importacion_idx ON laboral_tareas_empleado(importacion_clave);
CREATE INDEX IF NOT EXISTS laboral_tareas_fecha_inicio_idx ON laboral_tareas_empleado(fecha_inicio);
