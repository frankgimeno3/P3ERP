-- Orders remain as history when cancelled; they no longer generate expected income.
ALTER TABLE ordenes_db
  ADD COLUMN IF NOT EXISTS cancelada BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS cancelada_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelada_por TEXT,
  ADD COLUMN IF NOT EXISTS cancelacion_detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS id_agente TEXT,
  ADD COLUMN IF NOT EXISTS id_contacto_cobro TEXT,
  ADD COLUMN IF NOT EXISTS comentarios TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS con_iva BOOLEAN NOT NULL DEFAULT TRUE;
