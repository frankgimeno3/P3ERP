BEGIN;

ALTER TABLE contenidos_db
  ADD COLUMN IF NOT EXISTS codigo_crm_hoja TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cliente_hoja TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS publicacion_num_web TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tipo_revista_servicio TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS anuncio_hoja TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS articulo_hoja TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS pagina_hoja TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS caduca_web TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS comentarios_hoja TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS factura_hoja TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS control_redaccion_db (
  id BIGSERIAL PRIMARY KEY,
  prioridad TEXT NOT NULL DEFAULT '',
  donde_esta TEXT NOT NULL DEFAULT '',
  empresa TEXT NOT NULL DEFAULT '',
  titulo TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT '',
  responsable_correccion TEXT NOT NULL DEFAULT '',
  revista TEXT NOT NULL DEFAULT '',
  espana_previsto_numero TEXT NOT NULL DEFAULT '',
  latam_previsto_numero TEXT NOT NULL DEFAULT '',
  especial_numero TEXT NOT NULL DEFAULT '',
  hueco_previsto TEXT NOT NULL DEFAULT '',
  paginas TEXT NOT NULL DEFAULT '',
  estado_publicacion_vidrioperfil TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS control_redaccion_estado_idx ON control_redaccion_db (estado);
CREATE INDEX IF NOT EXISTS control_redaccion_empresa_idx ON control_redaccion_db (empresa);

COMMIT;
