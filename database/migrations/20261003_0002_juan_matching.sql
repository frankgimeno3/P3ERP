CREATE TABLE IF NOT EXISTS tesoreria_prevision_juan_asociaciones (
 workbook_id text NOT NULL REFERENCES tesoreria_prevision_juan(id),
 bank text NOT NULL CHECK(bank IN ('Sabadell','Santander')),
 row_id text NOT NULL,
 status text NOT NULL,
 provider_id text REFERENCES administracion_proveedores(id_proveedor),
 employee_id text REFERENCES agentes_db(id_agente),
 charge_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
 evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workbook_id,bank,row_id)
);
