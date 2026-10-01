ALTER TABLE tesoreria_cargos_recurrentes ADD COLUMN IF NOT EXISTS termina_planificacion boolean NOT NULL DEFAULT false;
ALTER TABLE tesoreria_cargos_recurrentes ADD COLUMN IF NOT EXISTS planificado_hasta date;
