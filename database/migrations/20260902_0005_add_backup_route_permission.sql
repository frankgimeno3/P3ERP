UPDATE roles_db
SET permisos_rol = CASE
  WHEN permisos_rol @> '["/dashboard/direccion/copias-seguridad"]'::jsonb THEN permisos_rol
  ELSE permisos_rol || '["/dashboard/direccion/copias-seguridad"]'::jsonb
END,
updated_at = NOW()
WHERE id_rol = 'superadmin';
