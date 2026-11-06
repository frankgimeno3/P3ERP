ALTER TABLE produccion_materiales ADD COLUMN IF NOT EXISTS es_version_acabada boolean NOT NULL DEFAULT false;
ALTER TABLE produccion_materiales ADD COLUMN IF NOT EXISTS numero_version integer;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='produccion_materiales'::regclass AND conname='material_finished_version_check') THEN
  ALTER TABLE produccion_materiales ADD CONSTRAINT material_finished_version_check
   CHECK ((es_version_acabada AND id_contenido IS NOT NULL AND numero_version IS NOT NULL AND numero_version>0) OR (NOT es_version_acabada AND numero_version IS NULL));
 END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS production_finished_version_unique ON produccion_materiales(id_contenido,numero_version) WHERE es_version_acabada;
COMMENT ON COLUMN produccion_materiales.es_version_acabada IS 'Material que contiene una versión acabada del contenido. Comparte el almacenamiento de materiales en S3.';
COMMENT ON COLUMN produccion_materiales.numero_version IS 'Secuencia por contenido desde 1 (V01), asignada con bloqueo del contenido; las versiones anteriores se conservan.';
SELECT public.p3_install_user_event_triggers();
