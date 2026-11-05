ALTER TABLE produccion_contenidos ADD COLUMN IF NOT EXISTS descripcion_contenido text NOT NULL DEFAULT '';
ALTER TABLE produccion_materiales ADD COLUMN IF NOT EXISTS descripcion_material text NOT NULL DEFAULT '';
ALTER TABLE mediateca_archivos ADD COLUMN IF NOT EXISTS mediateca_content_description text NOT NULL DEFAULT '';
ALTER TABLE mediateca_archivos DROP CONSTRAINT IF EXISTS mediateca_contents_type_check;
ALTER TABLE mediateca_archivos ADD CONSTRAINT mediateca_contents_type_check CHECK (mediateca_content_type IN ('image','pdf','file'));
CREATE TABLE IF NOT EXISTS produccion_cargas_materiales (
  id_carga uuid PRIMARY KEY,
  id_contenido text NOT NULL REFERENCES produccion_contenidos(id_contenido) ON UPDATE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
SELECT public.p3_install_user_event_triggers();
CREATE INDEX IF NOT EXISTS produccion_contenidos_tipo_idx ON produccion_contenidos(tipo_contenido);
COMMENT ON COLUMN produccion_contenidos.tipo_contenido IS 'Tipo del contenido: articulo, anuncio u otro. Los registros importados conservan sus tipos históricos y entregables combinados.';
COMMENT ON TABLE produccion_control_redaccion IS 'Datos editoriales históricos y de publicación de contenidos de tipo artículo; no es un inventario independiente de artículos.';
COMMENT ON TABLE produccion_cargas_materiales IS 'Altas de materiales confirmadas; evita duplicar contenidos o materiales al reintentar una subida.';
