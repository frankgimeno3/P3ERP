BEGIN;
ALTER TABLE public.administracion_ferias RENAME TO administracion_ferias_ediciones;
CREATE TABLE public.administracion_ferias_db (
  id_feria TEXT PRIMARY KEY,
  nombre_feria TEXT NOT NULL,
  pais TEXT NOT NULL DEFAULT '',
  periodicidad TEXT NOT NULL DEFAULT '',
  tematica TEXT NOT NULL DEFAULT '',
  descripcion TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX administracion_ferias_db_nombre_unique ON public.administracion_ferias_db (lower(btrim(nombre_feria)));
INSERT INTO public.administracion_ferias_db (id_feria,nombre_feria,pais,periodicidad,tematica,descripcion)
SELECT 'feria_base_'||md5(lower(btrim(nombre_feria))),
  (array_agg(btrim(nombre_feria) ORDER BY created_at))[1],
  coalesce(max(nullif(pais,'')),''),coalesce(max(nullif(periodicidad,'')),''),coalesce(max(nullif(tematica,'')),''),coalesce(max(nullif(descripcion,'')),'')
FROM public.administracion_ferias_ediciones WHERE btrim(nombre_feria)<>''
GROUP BY lower(btrim(nombre_feria));
ALTER TABLE public.administracion_ferias_ediciones
  ADD COLUMN id_feria_base TEXT REFERENCES public.administracion_ferias_db(id_feria),
  ADD COLUMN intercambio_detalle TEXT NOT NULL DEFAULT '',
  ADD COLUMN vuelos_detalle TEXT NOT NULL DEFAULT '',
  ADD COLUMN transporte_detalle TEXT NOT NULL DEFAULT '',
  ADD COLUMN transporte_revistas_detalle TEXT NOT NULL DEFAULT '',
  ADD COLUMN stand_detalle TEXT NOT NULL DEFAULT '',
  ADD COLUMN material_feria_detalle TEXT NOT NULL DEFAULT '',
  ADD COLUMN acreditaciones_detalle TEXT NOT NULL DEFAULT '',
  ADD COLUMN propuestas_asociadas_detalle TEXT NOT NULL DEFAULT '',
  ADD COLUMN contratos_asociados_detalle TEXT NOT NULL DEFAULT '',
  ADD COLUMN cuentas_asociadas_detalle TEXT NOT NULL DEFAULT '';
UPDATE public.administracion_ferias_ediciones
SET id_feria_base='feria_base_'||md5(lower(btrim(nombre_feria))) WHERE btrim(nombre_feria)<>'';
CREATE INDEX administracion_ferias_ediciones_base_idx ON public.administracion_ferias_ediciones(id_feria_base);
COMMIT;
