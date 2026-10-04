-- ERP budgets for groups and forecasts whose supplier/tax details are pending.
-- Presentation cells are no longer an independent financial source.
CREATE TABLE IF NOT EXISTS tesoreria_presupuestos_liquidez (
 anio integer NOT NULL CHECK(anio BETWEEN 2026 AND 2100),
 banco text NOT NULL CHECK(banco IN ('Sabadell','Santander')),
 seccion text NOT NULL CHECK(seccion IN ('income','payments')),
 concepto_id text NOT NULL,
 mes integer NOT NULL CHECK(mes BETWEEN 1 AND 12),
 importe numeric(14,2) CHECK(importe>=0),
 concepto text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(anio,banco,seccion,concepto_id,mes)
);
INSERT INTO tesoreria_presupuestos_liquidez(anio,banco,seccion,concepto_id,mes,importe,concepto)
SELECT substring(w.id from '[0-9]+')::integer,s->>'bank',section,r->>'id',
 (c->>'month')::integer,(r->'values'->>((position-1)::integer))::numeric/100,r->>'label'
FROM tesoreria_prevision_juan w
CROSS JOIN LATERAL jsonb_array_elements(w.sheets) s
CROSS JOIN (VALUES('income'),('payments')) sections(section)
CROSS JOIN LATERAL jsonb_array_elements(s->section) r
CROSS JOIN LATERAL jsonb_array_elements(s->'columns') WITH ORDINALITY cols(c,position)
WHERE c->>'kind'='forecast'
ON CONFLICT DO NOTHING;
COMMENT ON TABLE tesoreria_presupuestos_liquidez IS 'Presupuestos únicos del ERP. Los cargos y órdenes vinculados tienen prioridad sobre el presupuesto del grupo; nunca se suman dos veces.';
