BEGIN;

INSERT INTO roles_db (
  id_rol, nombre_rol, descripcion_rol, permisos_rol, accesos_personalizados,
  array_accesos_adicionales, estado_rol, created_at, updated_at
)
SELECT
  'base', 'base', descripcion_rol, permisos_rol, accesos_personalizados,
  array_accesos_adicionales, estado_rol, created_at, NOW()
FROM roles_db
WHERE id_rol = 'empleado'
ON CONFLICT (id_rol) DO UPDATE SET
  nombre_rol = 'base',
  descripcion_rol = EXCLUDED.descripcion_rol,
  permisos_rol = EXCLUDED.permisos_rol,
  accesos_personalizados = EXCLUDED.accesos_personalizados,
  array_accesos_adicionales = EXCLUDED.array_accesos_adicionales,
  estado_rol = EXCLUDED.estado_rol,
  updated_at = NOW();

UPDATE agentes_db
SET rol_agente = 'base', updated_at = NOW()
WHERE LOWER(BTRIM(COALESCE(rol_agente, ''))) = 'empleado';

DELETE FROM roles_db WHERE id_rol = 'empleado';

COMMIT;
