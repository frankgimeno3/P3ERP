CREATE TABLE IF NOT EXISTS administracion_facturas_subidas (
  id uuid PRIMARY KEY,
  s3_key text NOT NULL,
  url text NOT NULL,
  actor text NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','consumed','deleting','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  invoice_id text
);
