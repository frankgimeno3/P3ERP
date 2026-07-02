BEGIN;

CREATE TABLE IF NOT EXISTS grupos_servicios (
  id_medio text PRIMARY KEY,
  nombre_medio text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO grupos_servicios (id_medio, nombre_medio)
VALUES
  ('revista', 'Revista'),
  ('newsletter_personalizado', 'Newsletter personalizado'),
  ('vidrioperfil_newsletter', 'Vidrioperfil newsletter'),
  ('vidrioperfil_portal', 'Vidrioperfil portal'),
  ('otros', 'Otros')
ON CONFLICT (id_medio) DO UPDATE
SET nombre_medio = EXCLUDED.nombre_medio,
    updated_at = now();

ALTER TABLE servicios_db
  ADD COLUMN IF NOT EXISTS id_medio text NOT NULL DEFAULT 'otros';

ALTER TABLE servicios_db
  ADD COLUMN IF NOT EXISTS precio_tarifa numeric;

UPDATE servicios_db
SET
  id_medio = CASE
    WHEN lower(coalesce(nombre_servicio_es, '')) LIKE '%newsletter personalizado%'
      OR lower(coalesce(nombre_servicio_en, '')) LIKE '%customized newsletter%'
      THEN 'newsletter_personalizado'
    WHEN lower(coalesce(medio_servicio_es, '')) LIKE '%vidrioperfil%news%'
      OR lower(coalesce(soporte_servicio, '')) LIKE '%vidrioperfil%news%'
      THEN 'vidrioperfil_newsletter'
    WHEN lower(coalesce(medio_servicio_es, '')) LIKE '%portal%'
      OR lower(coalesce(soporte_servicio, '')) LIKE '%portal%'
      THEN 'vidrioperfil_portal'
    WHEN lower(coalesce(soporte_servicio, '')) LIKE '%revista%'
      OR lower(coalesce(medio_servicio_es, '')) LIKE '%revista%'
      OR lower(coalesce(publicacion_servicio_es, '')) LIKE '%revista%'
      THEN 'revista'
    ELSE 'otros'
  END,
  precio_tarifa = NULLIF(replace(regexp_replace(coalesce(precio_servicio, ''), '[^0-9,.-]', '', 'g'), ',', ''), '')::numeric,
  updated_at = now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'servicios_db_id_medio_fkey'
  ) THEN
    ALTER TABLE servicios_db
      ADD CONSTRAINT servicios_db_id_medio_fkey
      FOREIGN KEY (id_medio) REFERENCES grupos_servicios(id_medio);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS servicios_db_id_medio_idx ON servicios_db (id_medio);

COMMIT;
