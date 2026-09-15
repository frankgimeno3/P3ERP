CREATE TABLE IF NOT EXISTS prevision_recibos_excel (
  numero_recibo text PRIMARY KEY,
  numero_factura text NOT NULL,
  numero_cobro integer NOT NULL CHECK (numero_cobro > 0),
  numero_remesa text NOT NULL DEFAULT '',
  remesa_en_carpeta text NOT NULL DEFAULT '',
  cliente text NOT NULL DEFAULT '',
  importe_recibo numeric(14,2),
  importe_remesa numeric(14,2),
  fecha_creacion text,
  fecha_teorica text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (numero_factura, numero_cobro)
);
