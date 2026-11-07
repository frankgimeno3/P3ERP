ALTER TABLE produccion_contenidos
 ADD COLUMN IF NOT EXISTS estados_produccion jsonb NOT NULL DEFAULT '{}',
 ADD COLUMN IF NOT EXISTS url_indesign_recurso7 text NOT NULL DEFAULT '';
COMMENT ON COLUMN produccion_contenidos.estados_produccion IS 'Estado por entrega: articulos, anuncios u otros. El estado principal resume las entregas pendientes sin mezclar sus fases.';
COMMENT ON COLUMN produccion_contenidos.url_indesign_recurso7 IS 'Enlace InDesign en Recurso 7, editable en Gestiones de producción.';
SELECT public.p3_install_user_event_triggers();
