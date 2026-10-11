BEGIN;
ALTER TABLE laboral_tareas_empleado ADD COLUMN IF NOT EXISTS agentes_asociados JSONB NOT NULL DEFAULT '[]'::jsonb;
UPDATE laboral_tareas_empleado SET agentes_asociados=jsonb_build_array(agente) WHERE agente IS NOT NULL AND agente<>'' AND agentes_asociados='[]'::jsonb;
CREATE INDEX IF NOT EXISTS tareas_agentes_asociados_idx ON laboral_tareas_empleado USING gin(agentes_asociados);
ALTER TABLE mediateca_carpetas ADD COLUMN IF NOT EXISTS allowed_roles JSONB NOT NULL DEFAULT '[]'::jsonb;
UPDATE mediateca_carpetas SET allowed_roles=CASE mediateca_folder_name
 WHEN 'documentos_direccion' THEN '["direccion","superadmin"]'::jsonb
 WHEN 'documentos_administracion' THEN '["administracion","operaciones","direccion","superadmin"]'::jsonb
 WHEN 'contratos_firmados' THEN '["comercial","administracion","operaciones","direccion","superadmin"]'::jsonb
 ELSE allowed_roles END
 WHERE mediateca_parent_folder_id IS NULL AND allowed_roles='[]'::jsonb;
COMMIT;
