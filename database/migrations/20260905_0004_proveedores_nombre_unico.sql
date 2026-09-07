-- Apply after the requested supplier unification, in the same transaction.
CREATE UNIQUE INDEX IF NOT EXISTS proveedores_nombre_unico_idx
  ON proveedores_db(lower(regexp_replace(btrim(nombre_proveedor), '[[:space:]]+', ' ', 'g')))
  WHERE btrim(nombre_proveedor) <> '';
