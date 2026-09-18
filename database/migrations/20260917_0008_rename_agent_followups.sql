BEGIN;
SET LOCAL lock_timeout = '10s';
ALTER TABLE public.actividad_seguimientos RENAME TO agentes_seguimientos;
COMMENT ON TABLE public.agentes_seguimientos IS 'Seguimientos generales asignados a agentes.';
COMMIT;
