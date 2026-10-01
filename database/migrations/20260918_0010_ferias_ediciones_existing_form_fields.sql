ALTER TABLE public.administracion_ferias_ediciones
  ADD COLUMN IF NOT EXISTS id_revista_especial TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS id_propuesta_intercambio TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS estado_intercambio TEXT NOT NULL DEFAULT '';
