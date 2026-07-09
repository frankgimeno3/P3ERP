BEGIN;

ALTER TABLE revistas_db
  ADD COLUMN IF NOT EXISTS edicion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS revista text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS publicacion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS deadline_materiales text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_publicacion text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS especial text NOT NULL DEFAULT '';

WITH rows AS (
  SELECT
    format('rev_vp_iberia_%s', numero) AS id_revista,
    'Iberia' AS edicion,
    'Vidrio Plano' AS revista,
    numero::text AS publicacion,
    '' AS deadline_materiales,
    '' AS fecha_publicacion,
    '' AS especial
  FROM generate_series(216, 226) AS numero
  UNION ALL
  SELECT
    format('rev_vp_america_latina_%s', numero) AS id_revista,
    'América Latina' AS edicion,
    'Vidrio Plano' AS revista,
    numero::text AS publicacion,
    '' AS deadline_materiales,
    '' AS fecha_publicacion,
    '' AS especial
  FROM generate_series(90, 100) AS numero
  UNION ALL
  SELECT
    format('rev_vpcs_iberia_%s', numero) AS id_revista,
    'Iberia' AS edicion,
    'Ventanas, Puertas, Cerramientos y Protección Solar' AS revista,
    numero::text AS publicacion,
    '' AS deadline_materiales,
    '' AS fecha_publicacion,
    '' AS especial
  FROM generate_series(216, 226) AS numero
  UNION ALL
  SELECT
    format('rev_vpcs_america_latina_%s', numero) AS id_revista,
    'América Latina' AS edicion,
    'Ventanas, Puertas, Cerramientos y Protección Solar' AS revista,
    numero::text AS publicacion,
    '' AS deadline_materiales,
    '' AS fecha_publicacion,
    '' AS especial
  FROM generate_series(90, 100) AS numero
  UNION ALL
  SELECT
    format('rev_qq_vidrio_%s', ano) AS id_revista,
    'Vidrio' AS edicion,
    'Quién es Quién' AS revista,
    ano::text AS publicacion,
    '' AS deadline_materiales,
    '' AS fecha_publicacion,
    '' AS especial
  FROM generate_series(2026, 2029) AS ano
  UNION ALL
  SELECT
    format('rev_qq_ventanas_%s', ano) AS id_revista,
    'Ventanas, Puertas, Cerramientos y Protección solar' AS edicion,
    'Quién es Quién' AS revista,
    ano::text AS publicacion,
    '' AS deadline_materiales,
    '' AS fecha_publicacion,
    '' AS especial
  FROM generate_series(2026, 2029) AS ano
  UNION ALL
  SELECT
    format('rev_hueco_1_2_%s', ano) AS id_revista,
    '1/2' AS edicion,
    'Hueco Arquitectura' AS revista,
    ano::text AS publicacion,
    '' AS deadline_materiales,
    '' AS fecha_publicacion,
    '' AS especial
  FROM generate_series(2026, 2029) AS ano
  UNION ALL
  SELECT
    format('rev_hueco_2_2_%s', ano) AS id_revista,
    '2/2' AS edicion,
    'Hueco Arquitectura' AS revista,
    ano::text AS publicacion,
    '' AS deadline_materiales,
    '' AS fecha_publicacion,
    '' AS especial
  FROM generate_series(2026, 2029) AS ano
)
INSERT INTO revistas_db (
  id_revista,
  edicion,
  revista,
  publicacion,
  deadline_materiales,
  fecha_publicacion,
  especial
)
SELECT
  id_revista,
  edicion,
  revista,
  publicacion,
  deadline_materiales,
  fecha_publicacion,
  especial
FROM rows
ON CONFLICT (id_revista) DO UPDATE
SET edicion = EXCLUDED.edicion,
    revista = EXCLUDED.revista,
    publicacion = EXCLUDED.publicacion,
    deadline_materiales = EXCLUDED.deadline_materiales,
    fecha_publicacion = EXCLUDED.fecha_publicacion,
    especial = EXCLUDED.especial,
    updated_at = now();

CREATE INDEX IF NOT EXISTS revistas_db_revista_idx ON revistas_db (revista);
CREATE INDEX IF NOT EXISTS revistas_db_edicion_idx ON revistas_db (edicion);
CREATE INDEX IF NOT EXISTS revistas_db_publicacion_idx ON revistas_db (publicacion);

COMMIT;
