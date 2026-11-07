ALTER TABLE agentes_db ADD COLUMN IF NOT EXISTS fecha_baja date, ADD COLUMN IF NOT EXISTS motivo_baja text NOT NULL DEFAULT '';
COMMENT ON COLUMN agentes_db.fecha_baja IS 'Fecha efectiva de baja del empleado; no es la fecha técnica de desactivación del acceso.';
COMMENT ON COLUMN agentes_db.motivo_baja IS 'Motivo comunicado para la baja; se conserva junto al historial laboral.';
SELECT public.p3_install_user_event_triggers();
