ALTER TABLE public.comercial_contratos
  ADD COLUMN IF NOT EXISTS id_archivo_firmado uuid REFERENCES public.mediateca_archivos(mediateca_content_id) ON DELETE SET NULL;

COMMENT ON COLUMN public.comercial_contratos.id_archivo_firmado IS 'Archivo PDF o imagen del contrato firmado, guardado en contratos_firmados/agente/año.';
