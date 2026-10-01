BEGIN;
SET LOCAL lock_timeout = '10s';

ALTER TABLE public.produccion_materiales
  ADD COLUMN IF NOT EXISTS id_contenido text,
  ADD COLUMN IF NOT EXISTS id_revista text,
  ADD COLUMN IF NOT EXISTS tipo text,
  ADD COLUMN IF NOT EXISTS fecha_aportado timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS produccion_materiales_contenido_revista_idx
  ON public.produccion_materiales(id_contenido, id_revista, tipo);

ALTER TABLE public.produccion_control_redaccion
  ADD COLUMN IF NOT EXISTS id_contenido text;
CREATE UNIQUE INDEX IF NOT EXISTS produccion_control_redaccion_contenido_idx
  ON public.produccion_control_redaccion(id_contenido) WHERE id_contenido IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.produccion_revistas_contenidos (
  id_revista text NOT NULL REFERENCES public.servicios_revistas(id_revista),
  id_contenido text NOT NULL REFERENCES public.produccion_contenidos(id_contenido),
  tipo text NOT NULL CHECK (tipo IN ('articulos','anuncios')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id_revista, id_contenido, tipo)
);
COMMENT ON TABLE public.produccion_revistas_contenidos IS 'Asociaciones de contenidos con revistas, separadas por artículos y anuncios.';

INSERT INTO public.produccion_contenidos
  (id_contenido, hoja_prod, cliente_hoja, nombre_contenido, tipo_contenido,
   especificaciones_contenido, estado_contenido)
SELECT 'art_redaccion_' || id, true, empresa, titulo, 'articulo', titulo, estado
FROM public.produccion_control_redaccion
WHERE id_contenido IS NULL
ON CONFLICT (id_contenido) DO NOTHING;
UPDATE public.produccion_control_redaccion
SET id_contenido = 'art_redaccion_' || id
WHERE id_contenido IS NULL;
COMMIT;
