BEGIN;

UPDATE roles_db AS role
SET permisos_rol = (
  SELECT COALESCE(
    jsonb_agg(to_jsonb(replace(permission, '/dashboard/direccion/bancos', '/dashboard/direccion/tesoreria')) ORDER BY position),
    '[]'::jsonb
  )
  FROM jsonb_array_elements_text(role.permisos_rol) WITH ORDINALITY AS route(permission, position)
), updated_at = NOW()
WHERE role.permisos_rol::text LIKE '%/dashboard/direccion/bancos%';

COMMIT;
