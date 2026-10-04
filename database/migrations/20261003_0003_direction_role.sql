INSERT INTO agentes_roles(id_rol,nombre_rol,descripcion_rol,permisos_rol,estado_rol)
VALUES('direccion','Dirección','Dirección sin permisos de superadmin','["/dashboard","/dashboard/direccion"]'::jsonb,'activo')
ON CONFLICT(id_rol) DO NOTHING;
