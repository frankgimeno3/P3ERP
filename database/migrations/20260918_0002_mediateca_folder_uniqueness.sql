BEGIN;
SET LOCAL lock_timeout = '10s';
CREATE UNIQUE INDEX IF NOT EXISTS mediateca_root_folder_name_uq
  ON public.mediateca_carpetas(mediateca_folder_name)
  WHERE mediateca_parent_folder_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS mediateca_child_folder_name_uq
  ON public.mediateca_carpetas(mediateca_parent_folder_id, mediateca_folder_name)
  WHERE mediateca_parent_folder_id IS NOT NULL;
COMMENT ON TABLE public.produccion_revistas_contenidos IS 'Asociaciones de contenidos con revistas, separadas por artículos y anuncios.';
COMMIT;
