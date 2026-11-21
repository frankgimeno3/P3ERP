ALTER TABLE comercial_contactos
  ADD COLUMN IF NOT EXISTS es_contacto_administrativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS es_receptor_digital boolean NOT NULL DEFAULT false;
