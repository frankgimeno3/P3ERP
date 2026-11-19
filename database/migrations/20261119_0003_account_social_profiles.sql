BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.comercial_cuentas
  ADD COLUMN IF NOT EXISTS redes_sociales jsonb NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(redes_sociales) = 'array');

COMMIT;
