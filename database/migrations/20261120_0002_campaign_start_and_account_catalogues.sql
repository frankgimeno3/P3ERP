ALTER TABLE comercial_campanas ADD COLUMN IF NOT EXISTS fecha_inicio date;
ALTER TABLE comercial_cuentas ADD COLUMN IF NOT EXISTS catalogos_enlaces jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(catalogos_enlaces) = 'array');
