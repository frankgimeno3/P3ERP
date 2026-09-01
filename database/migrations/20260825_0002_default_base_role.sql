BEGIN;

UPDATE agentes_db
SET rol_agente = 'base', updated_at = NOW()
WHERE BTRIM(COALESCE(rol_agente, '')) = ''
   OR LOWER(BTRIM(rol_agente)) = 'empleado';

ALTER TABLE agentes_db
  ALTER COLUMN rol_agente SET DEFAULT 'base',
  ALTER COLUMN rol_agente SET NOT NULL;

COMMIT;
