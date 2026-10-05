CREATE TABLE IF NOT EXISTS mediateca_papelera (
  id uuid PRIMARY KEY,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  folders jsonb NOT NULL DEFAULT '[]',
  media jsonb NOT NULL DEFAULT '[]',
  restored_at timestamptz
);
