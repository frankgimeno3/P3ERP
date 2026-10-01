ALTER TABLE public.servicios_publicaciones
  ADD COLUMN IF NOT EXISTS fecha_recordatorio TEXT NOT NULL DEFAULT '';
