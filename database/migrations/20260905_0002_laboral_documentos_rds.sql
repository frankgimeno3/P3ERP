-- Keep uploads functional when no S3 bucket is configured.
ALTER TABLE documentos_laborales ADD COLUMN IF NOT EXISTS contenido BYTEA;
ALTER TABLE documentos_laborales ALTER COLUMN s3_key DROP NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='documentos_laborales'::regclass AND conname='documentos_laborales_almacenamiento_check') THEN
    ALTER TABLE documentos_laborales ADD CONSTRAINT documentos_laborales_almacenamiento_check
      CHECK (num_nonnulls(s3_key,contenido)=1 AND (contenido IS NULL OR octet_length(contenido)=tamano));
  END IF;
END $$;
