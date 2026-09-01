BEGIN;

UPDATE roles_db
SET permisos_rol = (
  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN permiso = '/dashboard/operaciones/usuariosyroles'
          THEN '/dashboard/operaciones/agentesyroles'
        ELSE permiso
      END
      ORDER BY orden
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements_text(COALESCE(permisos_rol, '[]'::jsonb)) WITH ORDINALITY AS accesos(permiso, orden)
)
WHERE COALESCE(permisos_rol, '[]'::jsonb) @> '["/dashboard/operaciones/usuariosyroles"]'::jsonb;

COMMIT;
