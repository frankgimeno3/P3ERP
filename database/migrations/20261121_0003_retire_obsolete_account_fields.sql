-- Converts the old start month before retiring the range and the removed fields.
WITH legacy AS (
 SELECT c.id_cuenta, coalesce(c.renovacion_anual->'rango'->>'entre',c.datos_comerciales->'envio_propuestas_anuales'->>'entre') AS start_date
 FROM comercial_cuentas c
 WHERE c.renovacion_anual ? 'rango' OR c.datos_comerciales ? 'envio_propuestas_anuales'
)
UPDATE comercial_cuentas c
SET renovacion_anual = (coalesce(c.renovacion_anual,'{}') - 'rango')
  || CASE WHEN c.renovacion_anual->>'activo' IS DISTINCT FROM 'false'
         AND c.renovacion_anual->>'fecha_aproximada' IS NULL
         AND legacy.start_date ~ '^[0-9]{1,2}/(0?[1-9]|1[0-2])$'
     THEN jsonb_build_object('fecha_aproximada', (CASE WHEN extract(month FROM CURRENT_DATE)>9 THEN extract(year FROM CURRENT_DATE)+1 ELSE extract(year FROM CURRENT_DATE) END)::int::text || '-' || lpad(split_part(legacy.start_date,'/',2),2,'0'))
     ELSE '{}'::jsonb END,
 datos_comerciales=coalesce(c.datos_comerciales,'{}') - 'envio_propuestas_anuales'
FROM legacy WHERE c.id_cuenta=legacy.id_cuenta;
ALTER TABLE comercial_cuentas
 DROP COLUMN IF EXISTS revisado_ricardo,
 DROP COLUMN IF EXISTS estado_leads_frios,
 DROP COLUMN IF EXISTS fuente_novedades_cuenta,
 DROP COLUMN IF EXISTS qq,
 DROP COLUMN IF EXISTS presente_en_qq;
