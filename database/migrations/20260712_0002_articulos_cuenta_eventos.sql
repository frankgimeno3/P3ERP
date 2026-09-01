ALTER TABLE revistas_articulos
  ADD COLUMN IF NOT EXISTS id_cuenta TEXT;

CREATE INDEX IF NOT EXISTS revistas_articulos_id_cuenta_idx
  ON revistas_articulos (id_cuenta);
