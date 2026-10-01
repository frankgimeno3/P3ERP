CREATE TABLE IF NOT EXISTS public.comercial_propuestas_plantillas (
  id_plantilla uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  versiones jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plantillas_espanol_obligatorio CHECK (versiones ? 'es')
);
COMMENT ON TABLE public.comercial_propuestas_plantillas IS 'Plantillas de líneas de servicios para propuestas, por idioma.';
