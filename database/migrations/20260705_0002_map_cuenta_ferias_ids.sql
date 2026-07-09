BEGIN;

WITH expanded AS (
  SELECT
    c.id_cuenta,
    trim(value) AS feria_texto
  FROM cuentas_db c
  CROSS JOIN LATERAL jsonb_array_elements_text(c.ferias) AS value
),
matched AS (
  SELECT DISTINCT
    e.id_cuenta,
    f.id_feria
  FROM expanded e
  JOIN ferias_db f
    ON lower(f.nombre_feria) = lower(e.feria_texto)
    OR lower(f.titulo_especifico_edicion) = lower(e.feria_texto)
    OR lower(f.nombre_feria) LIKE '%' || lower(e.feria_texto) || '%'
    OR lower(e.feria_texto) LIKE '%' || lower(f.nombre_feria) || '%'
  WHERE e.feria_texto <> ''
),
aggregated AS (
  SELECT id_cuenta, jsonb_agg(id_feria ORDER BY id_feria) AS ferias_ids
  FROM matched
  GROUP BY id_cuenta
)
UPDATE cuentas_db c
SET ferias = a.ferias_ids,
    updated_at = now()
FROM aggregated a
WHERE a.id_cuenta = c.id_cuenta
  AND a.ferias_ids IS NOT NULL;

COMMIT;
