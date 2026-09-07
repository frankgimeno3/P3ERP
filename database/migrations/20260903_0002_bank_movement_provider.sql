ALTER TABLE lineas_bancos
  ADD COLUMN IF NOT EXISTS id_proveedor TEXT REFERENCES proveedores_db(id_proveedor) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS lineas_bancos_id_proveedor_idx ON lineas_bancos (id_proveedor);
