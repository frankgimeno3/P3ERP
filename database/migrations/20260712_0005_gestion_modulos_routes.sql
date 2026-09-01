UPDATE roles_db
SET permisos_rol = (
  SELECT COALESCE(jsonb_agg(DISTINCT route), '[]'::jsonb)
  FROM (
    SELECT CASE
      WHEN value = '/dashboard/produccion/servicios' THEN '/dashboard/operaciones/gestion_modulos/servicios'
      WHEN value = '/dashboard/produccion/servicios/crear' THEN '/dashboard/operaciones/gestion_modulos/servicios/crear'
      WHEN value = '/dashboard/produccion/servicios/editor_tarifas' THEN '/dashboard/operaciones/gestion_modulos/servicios/editor_tarifas'
      WHEN value = '/dashboard/produccion/servicios/[id]' THEN '/dashboard/operaciones/gestion_modulos/servicios/[id]'
      ELSE value
    END AS route
    FROM jsonb_array_elements_text(COALESCE(permisos_rol, '[]'::jsonb)) AS existing(value)
    UNION ALL SELECT '/dashboard/administracion/proveedores/tickets'
    UNION ALL SELECT '/dashboard/operaciones/gestion_modulos'
    UNION ALL SELECT '/dashboard/operaciones/gestion_modulos/servicios'
    UNION ALL SELECT '/dashboard/operaciones/gestion_modulos/servicios/crear'
    UNION ALL SELECT '/dashboard/operaciones/gestion_modulos/servicios/editor_tarifas'
    UNION ALL SELECT '/dashboard/operaciones/gestion_modulos/servicios/[id]'
    UNION ALL SELECT '/dashboard/operaciones/gestion_modulos/operaciones_produccion'
    UNION ALL SELECT '/dashboard/operaciones/gestion_modulos/operaciones_comerciales'
    UNION ALL SELECT '/dashboard/operaciones/gestion_modulos/campanas_comerciales'
    UNION ALL SELECT '/dashboard/operaciones/gestion_modulos/campanas_comerciales/[id_campana]'
  ) routes
)
WHERE id_rol IN ('operaciones', 'superadmin');
