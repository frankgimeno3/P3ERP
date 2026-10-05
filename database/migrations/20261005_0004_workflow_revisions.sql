CREATE TABLE IF NOT EXISTS produccion_planillos_publicaciones (
  id_revista text NOT NULL,
  version integer NOT NULL,
  plan jsonb NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(id_revista,version)
);
CREATE TABLE IF NOT EXISTS operaciones_importaciones_aplicadas (
  fingerprint text PRIMARY KEY,
  payload_hash text NOT NULL,
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE comercial_suscripciones ADD COLUMN IF NOT EXISTS revista text;
ALTER TABLE comercial_suscripciones ADD COLUMN IF NOT EXISTS edicion text;
ALTER TABLE comercial_suscripciones ADD COLUMN IF NOT EXISTS renovacion_propuesta_id text;
