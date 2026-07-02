BEGIN;

ALTER TABLE agentes_db
  ADD COLUMN IF NOT EXISTS email_agente text NOT NULL DEFAULT '';

UPDATE agentes_db
SET
  email_agente = CASE id_agente
    WHEN 'ag_25_0001' THEN 'carlos.ortega@p3.com'
    WHEN 'ag_25_0002' THEN 'ricardo.calleja@p3.com'
    WHEN 'ag_25_0003' THEN 'carlos.lamiel@p3.com'
    WHEN 'ag_25_0004' THEN 'jose.fernandez@p3.com'
    WHEN 'ag_25_0005' THEN 'montserrat.valencia@p3.com'
    WHEN 'ag_25_0006' THEN 'frank.superadmin@p3.com'
    WHEN 'ag_25_0007' THEN 'frank.gimeno@p3.com'
    ELSE email_agente
  END,
  updated_at = now()
WHERE email_agente = '';

COMMIT;
