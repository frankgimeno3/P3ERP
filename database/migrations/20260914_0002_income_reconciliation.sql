ALTER TABLE remesas_db
  ADD COLUMN IF NOT EXISTS remesa_en_carpeta text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS importe_declarado numeric(14,2);
ALTER TABLE prevision_recibos_excel
  ADD COLUMN IF NOT EXISTS id_orden text REFERENCES ordenes_db(id_orden),
  ADD COLUMN IF NOT EXISTS id_remesa text REFERENCES remesas_db(id_remesa);
CREATE UNIQUE INDEX IF NOT EXISTS prevision_recibos_orden_unique ON prevision_recibos_excel(id_orden) WHERE id_orden IS NOT NULL;
CREATE INDEX IF NOT EXISTS prevision_recibos_remesa_idx ON prevision_recibos_excel(id_remesa);
ALTER TABLE lineas_bancos ADD COLUMN IF NOT EXISTS tipo_ingreso text;
CREATE TABLE IF NOT EXISTS banco_cobros_ordenes (
  id_linea_banco text NOT NULL REFERENCES lineas_bancos(id_linea_banco),
  id_orden text NOT NULL REFERENCES ordenes_db(id_orden),
  id_remesa text REFERENCES remesas_db(id_remesa),
  importe numeric(14,2) NOT NULL CHECK(importe > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(id_linea_banco,id_orden)
);
CREATE INDEX IF NOT EXISTS banco_cobros_orden_idx ON banco_cobros_ordenes(id_orden);
ALTER TABLE ordenes_db ADD COLUMN IF NOT EXISTS cobro_revision_bancaria boolean NOT NULL DEFAULT false;
ALTER TABLE ordenes_db ADD COLUMN IF NOT EXISTS datos_importacion jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE facturas_clientes_db
  ADD COLUMN IF NOT EXISTS cobrada boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS importe_cobrado numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_real_cobro text;

INSERT INTO remesas_db(id_remesa,remesa_en_carpeta,importe_declarado)
SELECT DISTINCT ON (btrim(numero_remesa)) btrim(numero_remesa),
  CASE WHEN btrim(remesa_en_carpeta)='-' THEN '' ELSE btrim(remesa_en_carpeta) END, importe_remesa
FROM prevision_recibos_excel WHERE btrim(numero_remesa) NOT IN ('','-')
ORDER BY btrim(numero_remesa),updated_at DESC
ON CONFLICT(id_remesa) DO NOTHING;
UPDATE prevision_recibos_excel SET id_remesa=btrim(numero_remesa)
WHERE id_remesa IS NULL AND btrim(numero_remesa) NOT IN ('','-');

CREATE OR REPLACE FUNCTION p3_income_date(value text) RETURNS date LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF value ~ '^[0-9]{1,2}/[0-9]{1,2}/[0-9]{4}$' THEN
    RETURN make_date(split_part(value,'/',3)::int,split_part(value,'/',2)::int,split_part(value,'/',1)::int);
  ELSIF value ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' THEN
    RETURN make_date(substring(value,1,4)::int,substring(value,6,2)::int,substring(value,9,2)::int);
  END IF;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN RETURN NULL;
END $$;

CREATE OR REPLACE VIEW prevision_remesas_resumen AS
SELECT m.id_remesa,m.remesa_en_carpeta,m.importe_declarado,m.created_at,m.updated_at,
  count(r.numero_recibo)::int numero_recibos,
  COALESCE(sum(COALESCE(o.cobro_total,r.importe_recibo)),0) importe_total,
  count(r.numero_recibo) FILTER(WHERE r.id_orden IS NULL)::int recibos_sin_orden,
  COALESCE(bool_and(COALESCE(o.cobrada,false)) FILTER(WHERE r.numero_recibo IS NOT NULL),false) cobrada,
  to_char(max(p3_income_date(COALESCE(NULLIF(o.fecha_teorica_cobro,''),r.fecha_teorica))),'DD/MM/YYYY') fecha_teorica,
  CASE WHEN bool_and(COALESCE(o.cobrada,false)) THEN to_char(max(p3_income_date(o.fecha_real_cobro)),'DD/MM/YYYY') END fecha_real_cobro,
  array_remove(array_agg(DISTINCT o.id_orden),NULL) ordenes,
  string_agg(DISTINCT COALESCE(NULLIF(cu.nombre_empresa,''),NULLIF(r.cliente,'')),', ') clientes
FROM remesas_db m LEFT JOIN prevision_recibos_excel r ON r.id_remesa=m.id_remesa
LEFT JOIN ordenes_db o ON o.id_orden=r.id_orden
LEFT JOIN contratos_db c ON c.id_contrato=o.id_contrato
LEFT JOIN cuentas_db cu ON cu.id_cuenta=COALESCE(NULLIF(o.id_cuenta,''),c.id_cuenta_contrato)
GROUP BY m.id_remesa;
