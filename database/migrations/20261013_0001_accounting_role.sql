INSERT INTO agentes_roles(id_rol,nombre_rol,descripcion_rol,permisos_rol,estado_rol)
VALUES('contabilidad','Contabilidad','Acceso a Comercial, Administración y Dirección. Sin acceso a Operaciones ni Producción.',
 '["/dashboard","/dashboard/comercial","/dashboard/administracion","/dashboard/direccion","/dashboard/mediateca","/tareas"]'::jsonb,'activo')
ON CONFLICT(id_rol) DO UPDATE SET nombre_rol=EXCLUDED.nombre_rol,descripcion_rol=EXCLUDED.descripcion_rol,permisos_rol=EXCLUDED.permisos_rol,estado_rol='activo',updated_at=now();
