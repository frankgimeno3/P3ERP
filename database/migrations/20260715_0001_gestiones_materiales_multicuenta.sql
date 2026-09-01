ALTER TABLE gestiones_produccion_db
  ADD COLUMN IF NOT EXISTS array_ids_cuentas JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS array_ids_contenidos JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gestiones_produccion_db'
      AND column_name = 'id_cuenta'
  ) THEN
    UPDATE gestiones_produccion_db
    SET array_ids_cuentas = CASE
      WHEN id_cuenta IS NULL OR id_cuenta = '' THEN COALESCE(array_ids_cuentas, '[]'::jsonb)
      WHEN COALESCE(jsonb_array_length(array_ids_cuentas), 0) = 0 THEN jsonb_build_array(id_cuenta)
      WHEN NOT array_ids_cuentas ? id_cuenta THEN array_ids_cuentas || jsonb_build_array(id_cuenta)
      ELSE array_ids_cuentas
    END;

    DROP INDEX IF EXISTS gestiones_produccion_db_id_cuenta_idx;
    ALTER TABLE gestiones_produccion_db DROP COLUMN id_cuenta;
  END IF;
END $$;

ALTER TABLE contenidos_db
  ADD COLUMN IF NOT EXISTS array_ids_materiales JSONB NOT NULL DEFAULT '[]'::jsonb;
