BEGIN;
SET LOCAL lock_timeout = '10s';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.tesoreria_registros_bancarios LIMIT 1) THEN
    RAISE EXCEPTION 'tesoreria_registros_bancarios contiene datos';
  END IF;
  IF EXISTS (SELECT 1 FROM public.fiscal_verifactu_trabajos LIMIT 1) THEN
    RAISE EXCEPTION 'fiscal_verifactu_trabajos contiene datos';
  END IF;
END $$;

DROP TABLE public.tesoreria_registros_bancarios;
DROP TABLE public.fiscal_verifactu_trabajos;
COMMIT;
