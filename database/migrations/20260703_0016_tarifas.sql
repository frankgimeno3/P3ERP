BEGIN;

CREATE TABLE IF NOT EXISTS tarifas_db (
  id_tarifa text PRIMARY KEY,
  nombre_docu_tarifas text NOT NULL DEFAULT '',
  ano text NOT NULL DEFAULT '',
  version text NOT NULL DEFAULT '',
  idioma text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS paginas_tarifas (
  id_pagina_tarifa text PRIMARY KEY,
  id_tarifa text NOT NULL REFERENCES tarifas_db(id_tarifa) ON DELETE CASCADE,
  array_id_servicios text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS paginas_tarifas_id_tarifa_idx ON paginas_tarifas (id_tarifa);

INSERT INTO tarifas_db (id_tarifa, nombre_docu_tarifas, ano, version, idioma)
VALUES
  ('tar_2026_es_v1', 'Tarifas comerciales 2026 ES', '2026', 'v1', 'es'),
  ('tar_2026_en_v1', 'Commercial rates 2026 EN', '2026', 'v1', 'en')
ON CONFLICT (id_tarifa) DO UPDATE
SET nombre_docu_tarifas = EXCLUDED.nombre_docu_tarifas,
    ano = EXCLUDED.ano,
    version = EXCLUDED.version,
    idioma = EXCLUDED.idioma,
    updated_at = now();

WITH servicios_ordenados AS (
  SELECT id_servicio, row_number() OVER (ORDER BY id_medio ASC, id_servicio ASC) AS rn
  FROM servicios_db
),
paginas_seed AS (
  SELECT
    id_tarifa,
    pagina,
    ARRAY(
      SELECT id_servicio
      FROM servicios_ordenados
      WHERE rn BETWEEN ((pagina - 1) * 8 + 1) AND (pagina * 8)
      ORDER BY rn
    ) AS servicios
  FROM (VALUES
    ('tar_2026_es_v1', 1),
    ('tar_2026_es_v1', 2),
    ('tar_2026_en_v1', 1),
    ('tar_2026_en_v1', 2)
  ) AS seed(id_tarifa, pagina)
)
INSERT INTO paginas_tarifas (id_pagina_tarifa, id_tarifa, array_id_servicios)
SELECT
  id_tarifa || '_pag_' || lpad(pagina::text, 2, '0'),
  id_tarifa,
  servicios
FROM paginas_seed
WHERE cardinality(servicios) > 0
ON CONFLICT (id_pagina_tarifa) DO UPDATE
SET array_id_servicios = EXCLUDED.array_id_servicios,
    updated_at = now();

COMMIT;
