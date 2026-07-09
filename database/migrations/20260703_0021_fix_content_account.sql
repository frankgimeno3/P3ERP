BEGIN;

UPDATE contenidos_db
SET id_cuenta = '62500003',
    updated_at = now()
WHERE id_contenido = 'content_25_00004'
  AND NOT EXISTS (
    SELECT 1
    FROM cuentas_db
    WHERE cuentas_db.id_cuenta = contenidos_db.id_cuenta
  );

COMMIT;
