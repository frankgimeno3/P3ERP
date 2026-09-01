BEGIN;

ALTER TABLE facturas_clientes_db
  ADD COLUMN IF NOT EXISTS tipo_cambio_eur NUMERIC,
  ADD COLUMN IF NOT EXISTS verifactu_operation_description TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_taxable_base NUMERIC,
  ADD COLUMN IF NOT EXISTS verifactu_vat_rate NUMERIC,
  ADD COLUMN IF NOT EXISTS verifactu_vat_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS verifactu_is_rectifying BOOLEAN,
  ADD COLUMN IF NOT EXISTS verifactu_software_producer_nif TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_software_producer_name TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_software_name TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_software_id TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_obligated_issuer_nif TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_exclusive_use BOOLEAN,
  ADD COLUMN IF NOT EXISTS verifactu_multi_entity BOOLEAN,
  ADD COLUMN IF NOT EXISTS verifactu_xsd_version TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_record_payload_json JSONB;

ALTER TABLE lineas_facturas_db
  ADD COLUMN IF NOT EXISTS operacion_fiscal TEXT NOT NULL DEFAULT 'sujeta_no_exenta',
  ADD COLUMN IF NOT EXISTS causa_exencion TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS inversion_sujeto_pasivo BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS recargo_equivalencia_porcentaje NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retencion_porcentaje NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE verifactu_records
  ADD COLUMN IF NOT EXISTS operation_description TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS taxable_base NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_rate NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vat_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_rectifying BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS software_producer_nif TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS software_producer_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS software_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS software_id TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS obligated_issuer_nif TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS exclusive_use BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS multi_entity BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS xsd_version TEXT NOT NULL DEFAULT '1.0',
  ADD COLUMN IF NOT EXISTS record_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS verifactu_installations (
  installation_id TEXT PRIMARY KEY,
  producer_nif TEXT NOT NULL,
  producer_name TEXT NOT NULL,
  software_name TEXT NOT NULL,
  software_id TEXT NOT NULL,
  software_version TEXT NOT NULL,
  exclusive_use BOOLEAN NOT NULL DEFAULT TRUE,
  multi_entity BOOLEAN NOT NULL DEFAULT FALSE,
  declaration_issued_at DATE NOT NULL,
  declaration_text TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO verifactu_installations (
  installation_id,producer_nif,producer_name,software_name,software_id,
  software_version,exclusive_use,multi_entity,declaration_issued_at,declaration_text
) VALUES (
  'P3ERP-PRODUCCION-01','', 'PROPORCION 3, S.A.','P3ERP','P3',
  '1.0.1-verifactu',TRUE,FALSE,CURRENT_DATE,
  'PROPORCION 3, S.A., como productor de P3ERP 1.0.1-verifactu, declara responsablemente que esta versión del sistema informático de facturación ha sido diseñada para cumplir los requisitos aplicables a los sistemas VERI*FACTU. Esta declaración debe revisarse y emitirse nuevamente para cada versión.'
) ON CONFLICT (installation_id) DO NOTHING;

UPDATE verifactu_installations SET software_id='P3',software_version='1.0.1-verifactu',
  declaration_issued_at=CURRENT_DATE,
  declaration_text='PROPORCION 3, S.A., como productor de P3ERP 1.0.1-verifactu, declara responsablemente que esta versión del sistema informático de facturación ha sido diseñada para cumplir los requisitos aplicables a los sistemas VERI*FACTU. Esta declaración debe revisarse y emitirse nuevamente para cada versión.',
  updated_at=NOW()
WHERE installation_id='P3ERP-PRODUCCION-01';

CREATE TABLE IF NOT EXISTS verifactu_outbox (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING','SENDING','ACCEPTED','ACCEPTED_WITH_ERRORS','REJECTED',
    'RETRY_PENDING','INCIDENT','CANCELLED'
  )),
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  request_xml TEXT,
  response_xml TEXT,
  response_json JSONB,
  aeat_csv TEXT,
  aeat_error_code TEXT,
  aeat_error_description TEXT,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS verifactu_outbox_dispatch_idx
  ON verifactu_outbox(status, available_at);

COMMIT;
