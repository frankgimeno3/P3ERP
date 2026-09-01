ALTER TABLE tareas_db
  ADD COLUMN IF NOT EXISTS ordenante TEXT NOT NULL DEFAULT 'creada automáticamente';

UPDATE roles_db
SET permisos_rol = (
  SELECT COALESCE(jsonb_agg(DISTINCT route), '[]'::jsonb)
  FROM (
    SELECT CASE
      WHEN value = '/dashboard/operaciones/gestiones_comerciales' THEN '/dashboard/operaciones/tareas_comerciales'
      WHEN value = '/dashboard/operaciones/gestiones_comerciales/campanas_comerciales' THEN '/dashboard/operaciones/tareas_comerciales/campanas_comerciales'
      WHEN value = '/dashboard/operaciones/gestiones_comerciales/campanas_comerciales/[id_campana]' THEN '/dashboard/operaciones/tareas_comerciales/campanas_comerciales/[id_campana]'
      ELSE value
    END AS route
    FROM jsonb_array_elements_text(COALESCE(permisos_rol, '[]'::jsonb)) AS existing(value)
    UNION ALL SELECT '/dashboard/operaciones/tareas_comerciales'
    UNION ALL SELECT '/dashboard/operaciones/tareas_comerciales/campanas_comerciales'
    UNION ALL SELECT '/dashboard/operaciones/tareas_comerciales/campanas_comerciales/[id_campana]'
  ) routes
)
WHERE id_rol IN ('operaciones', 'superadmin');
