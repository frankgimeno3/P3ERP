CREATE TABLE IF NOT EXISTS administracion_facturas_documentos (
  id_documento TEXT PRIMARY KEY,
  id_factura_cliente TEXT NOT NULL REFERENCES administracion_facturas_clientes(id_factura_cliente) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  contenido BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(id_factura_cliente,sha256),
  CHECK(octet_length(contenido)>0 AND octet_length(contenido)<=15728640)
);
CREATE INDEX IF NOT EXISTS customer_invoice_documents_invoice_idx ON administracion_facturas_documentos(id_factura_cliente);
