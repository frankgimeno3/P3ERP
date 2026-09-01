BEGIN;

ALTER TABLE facturas_clientes_db
  ADD COLUMN IF NOT EXISTS factura_origen_id TEXT,
  ADD COLUMN IF NOT EXISTS factura_tipo TEXT NOT NULL DEFAULT 'ordinaria',
  ADD COLUMN IF NOT EXISTS comentarios_internos TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verifactu_estado_envio TEXT NOT NULL DEFAULT 'borrador',
  ADD COLUMN IF NOT EXISTS verifactu_emisor TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verifactu_serie TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS verifactu_numero BIGINT,
  ADD COLUMN IF NOT EXISTS verifactu_fecha_expedicion DATE,
  ADD COLUMN IF NOT EXISTS verifactu_id TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_record_type TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_issuer_nif TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_issuer_name TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_invoice_series TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_invoice_date DATE,
  ADD COLUMN IF NOT EXISTS verifactu_customer_nif TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_customer_name TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_invoice_type TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_tax_breakdown_json JSONB,
  ADD COLUMN IF NOT EXISTS verifactu_total_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS verifactu_previous_record_id TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_previous_invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_previous_invoice_date DATE,
  ADD COLUMN IF NOT EXISTS verifactu_previous_hash TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_current_hash TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_generated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verifactu_aeat_status TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_aeat_csv TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_aeat_error_code TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_aeat_error_description TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_xml_payload TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_xml_response TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verifactu_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verifactu_software_version TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_installation_id TEXT,
  ADD COLUMN IF NOT EXISTS verifactu_created_at TIMESTAMPTZ;

ALTER TABLE facturas_clientes_db DROP CONSTRAINT IF EXISTS facturas_clientes_verifactu_estado_check;
ALTER TABLE facturas_clientes_db ADD CONSTRAINT facturas_clientes_verifactu_estado_check
  CHECK (verifactu_estado_envio IN ('borrador', 'factura emitida'));
ALTER TABLE facturas_clientes_db DROP CONSTRAINT IF EXISTS facturas_clientes_tipo_check;
ALTER TABLE facturas_clientes_db ADD CONSTRAINT facturas_clientes_tipo_check
  CHECK (factura_tipo IN ('ordinaria', 'rectificativa', 'abono'));

CREATE TABLE IF NOT EXISTS verifactu_counters (
  issuer_nif TEXT NOT NULL,
  invoice_series TEXT NOT NULL,
  next_number BIGINT NOT NULL DEFAULT 1 CHECK (next_number > 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (issuer_nif, invoice_series)
);

CREATE TABLE IF NOT EXISTS verifactu_records (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL,
  record_type TEXT NOT NULL CHECK (record_type IN ('ALTA', 'ANULACION')),
  issuer_nif TEXT NOT NULL,
  issuer_name TEXT NOT NULL,
  invoice_series TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  customer_nif TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  invoice_type TEXT NOT NULL,
  tax_breakdown_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_amount NUMERIC NOT NULL,
  previous_record_id TEXT,
  previous_invoice_number TEXT,
  previous_invoice_date DATE,
  previous_hash TEXT,
  current_hash TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  aeat_status TEXT NOT NULL DEFAULT 'pendiente',
  aeat_csv TEXT,
  aeat_error_code TEXT,
  aeat_error_description TEXT,
  xml_payload TEXT,
  xml_response TEXT,
  sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  software_version TEXT NOT NULL,
  installation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT verifactu_records_fiscal_identity_key UNIQUE (issuer_nif, invoice_series, invoice_number, invoice_date),
  CONSTRAINT verifactu_records_invoice_key UNIQUE (invoice_id)
);

CREATE TABLE IF NOT EXISTS verifactu_jobs (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL UNIQUE,
  job_type TEXT NOT NULL DEFAULT 'ENVIO_AEAT',
  status TEXT NOT NULL DEFAULT 'pendiente',
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION protect_verifactu_records() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    RAISE EXCEPTION 'Los registros VERI*FACTU son inmutables';
  END IF;
  IF TG_OP = 'INSERT' AND COALESCE(current_setting('app.billing_service', true), '') <> 'on' THEN
    RAISE EXCEPTION 'Los registros VERI*FACTU solo pueden crearse desde el servicio de facturación';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS verifactu_records_immutable_trg ON verifactu_records;
CREATE TRIGGER verifactu_records_immutable_trg
BEFORE INSERT OR UPDATE OR DELETE ON verifactu_records
FOR EACH ROW EXECUTE FUNCTION protect_verifactu_records();

CREATE OR REPLACE FUNCTION protect_emitted_invoice() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.verifactu_estado_envio = 'factura emitida' THEN
    RAISE EXCEPTION 'Una factura emitida no se puede eliminar';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.verifactu_estado_envio = 'factura emitida' THEN
    IF (to_jsonb(NEW) - ARRAY['comentarios_internos','updated_at'])
       IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['comentarios_internos','updated_at']) THEN
      RAISE EXCEPTION 'Una factura emitida solo permite modificar comentarios internos';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS facturas_clientes_emitted_immutable_trg ON facturas_clientes_db;
CREATE TRIGGER facturas_clientes_emitted_immutable_trg
BEFORE UPDATE OR DELETE ON facturas_clientes_db
FOR EACH ROW EXECUTE FUNCTION protect_emitted_invoice();

CREATE OR REPLACE FUNCTION protect_emitted_invoice_lines() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  target_invoice_id TEXT;
  target_status TEXT;
BEGIN
  target_invoice_id := COALESCE(NEW.id_factura_cliente, OLD.id_factura_cliente);
  SELECT verifactu_estado_envio INTO target_status
  FROM facturas_clientes_db WHERE id_factura_cliente = target_invoice_id;
  IF target_status = 'factura emitida' THEN
    RAISE EXCEPTION 'Las líneas de una factura emitida son inmutables';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS lineas_facturas_emitted_immutable_trg ON lineas_facturas_db;
CREATE TRIGGER lineas_facturas_emitted_immutable_trg
BEFORE INSERT OR UPDATE OR DELETE ON lineas_facturas_db
FOR EACH ROW EXECUTE FUNCTION protect_emitted_invoice_lines();

COMMIT;
