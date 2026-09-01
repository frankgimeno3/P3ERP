UPDATE roles_db
SET permisos_rol = (
  SELECT COALESCE(jsonb_agg(DISTINCT route), '[]'::jsonb)
  FROM (
    SELECT CASE
      WHEN value IN ('/dashboard/operaciones/gestion_modulos', '/dashboard/operaciones/gestion_modulos/operaciones_produccion') THEN '/dashboard/operaciones/gestion_produccion'
      WHEN value = '/dashboard/operaciones/gestion_modulos/servicios' THEN '/dashboard/operaciones/gestion_produccion/servicios'
      WHEN value = '/dashboard/operaciones/gestion_modulos/servicios/crear' THEN '/dashboard/operaciones/gestion_produccion/servicios/crear'
      WHEN value = '/dashboard/operaciones/gestion_modulos/servicios/editor_tarifas' THEN '/dashboard/operaciones/gestion_produccion/servicios/editor_tarifas'
      WHEN value = '/dashboard/operaciones/gestion_modulos/servicios/[id]' THEN '/dashboard/operaciones/gestion_produccion/servicios/[id]'
      WHEN value = '/dashboard/operaciones/gestion_modulos/operaciones_comerciales' THEN '/dashboard/operaciones/gestiones_comerciales'
      WHEN value = '/dashboard/operaciones/gestion_modulos/campanas_comerciales' THEN '/dashboard/operaciones/gestiones_comerciales/campanas_comerciales'
      WHEN value = '/dashboard/operaciones/gestion_modulos/campanas_comerciales/[id_campana]' THEN '/dashboard/operaciones/gestiones_comerciales/campanas_comerciales/[id_campana]'
      ELSE value
    END AS route
    FROM jsonb_array_elements_text(COALESCE(permisos_rol, '[]'::jsonb)) AS existing(value)
    UNION ALL SELECT '/dashboard/operaciones/gestion_produccion'
    UNION ALL SELECT '/dashboard/operaciones/gestion_produccion/servicios'
    UNION ALL SELECT '/dashboard/operaciones/gestion_produccion/servicios/crear'
    UNION ALL SELECT '/dashboard/operaciones/gestion_produccion/servicios/editor_tarifas'
    UNION ALL SELECT '/dashboard/operaciones/gestion_produccion/servicios/[id]'
    UNION ALL SELECT '/dashboard/operaciones/gestiones_comerciales'
    UNION ALL SELECT '/dashboard/operaciones/gestiones_comerciales/campanas_comerciales'
    UNION ALL SELECT '/dashboard/operaciones/gestiones_comerciales/campanas_comerciales/[id_campana]'
    UNION ALL SELECT '/dashboard/operaciones/gestion_cuentas'
  ) routes
)
WHERE id_rol IN ('operaciones', 'superadmin');
