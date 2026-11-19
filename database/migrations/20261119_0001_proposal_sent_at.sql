BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.comercial_propuestas_db ADD COLUMN IF NOT EXISTS enviada_at timestamptz;

WITH envios AS (
  SELECT clave->>'id_propuesta' AS id_propuesta, max(fecha) AS fecha
  FROM public.eventos_de_usuarios
  WHERE tabla = 'comercial_propuestas_db'
    AND datos_anteriores->'enviada' IS DISTINCT FROM 'true'::jsonb
    AND datos_nuevos->'enviada' = 'true'::jsonb
  GROUP BY clave->>'id_propuesta'
)
UPDATE public.comercial_propuestas_db p
SET enviada_at = e.fecha
FROM envios e
WHERE p.id_propuesta = e.id_propuesta AND p.enviada AND p.enviada_at IS NULL;

CREATE OR REPLACE FUNCTION public.p3_set_proposal_sent_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT NEW.enviada THEN
    NEW.enviada_at := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.enviada_at := clock_timestamp();
  ELSIF OLD.enviada IS DISTINCT FROM TRUE THEN
    NEW.enviada_at := clock_timestamp();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS p3_proposal_sent_at ON public.comercial_propuestas_db;
CREATE TRIGGER p3_proposal_sent_at
BEFORE INSERT OR UPDATE OF enviada ON public.comercial_propuestas_db
FOR EACH ROW EXECUTE FUNCTION public.p3_set_proposal_sent_at();

COMMIT;
