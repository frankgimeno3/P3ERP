ALTER TABLE produccion_contenidos ADD COLUMN IF NOT EXISTS maquetacion_produccion jsonb NOT NULL DEFAULT '{}';
ALTER TABLE produccion_materiales ADD COLUMN IF NOT EXISTS pdf_paginas integer CHECK (pdf_paginas BETWEEN 1 AND 1000);

CREATE TABLE IF NOT EXISTS produccion_maquetas (
 id_revista text NOT NULL REFERENCES servicios_revistas(id_revista) ON UPDATE CASCADE ON DELETE CASCADE,
 soporte text NOT NULL CHECK (soporte IN ('impresa','digital')),
 estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','publicada')),
 total_paginas integer NOT NULL DEFAULT 8 CHECK (total_paginas BETWEEN 2 AND 1000 AND total_paginas % 2 = 0),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (id_revista,soporte)
);
CREATE TABLE IF NOT EXISTS produccion_maqueta_contenidos (
 id_revista text NOT NULL,
 soporte text NOT NULL,
 id_contenido text NOT NULL REFERENCES produccion_contenidos(id_contenido) ON UPDATE CASCADE ON DELETE CASCADE,
 tipo text NOT NULL CHECK (tipo IN ('articulos','anuncios')),
 posicion integer NOT NULL CHECK (posicion >= -1),
 paginas integer NOT NULL CHECK (paginas BETWEEN 1 AND 1000),
 seccion text NOT NULL CHECK (length(trim(seccion)) BETWEEN 1 AND 120),
 id_material text NOT NULL REFERENCES produccion_materiales(id_material) ON UPDATE CASCADE ON DELETE RESTRICT,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (id_revista,soporte,id_contenido,tipo),
 FOREIGN KEY (id_revista,soporte) REFERENCES produccion_maquetas(id_revista,soporte) ON UPDATE CASCADE ON DELETE CASCADE,
 CHECK (posicion + paginas <= 999)
);
SELECT public.p3_install_user_event_triggers();

-- Existing historical states are preserved. New transitions into phase 6 must be complete.
CREATE OR REPLACE FUNCTION p3_require_final_magazine_pdf() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE kind text; config jsonb; previous_state text; next_state text; material produccion_materiales%ROWTYPE;
BEGIN
 IF NOT (coalesce(NEW.destino_revista,false)
   OR coalesce(NEW.tipo_revista_servicio,'') ~* '(revista|hueco arquitectura|qui.n es qui.n)'
   OR EXISTS (SELECT 1 FROM servicios_db s WHERE s.id_servicio=NEW.servicio AND (s.id_medio='revista' OR (NULLIF(s.id_medio,'') IS NULL AND coalesce(s.nombre_servicio_es,'') ~* '(revista|hueco arquitectura|qui.n es qui.n)')))
   OR EXISTS (SELECT 1 FROM produccion_revistas_contenidos r WHERE r.id_contenido=NEW.id_contenido)
   OR EXISTS (SELECT 1 FROM servicios_publicaciones p WHERE p.id_publicacion IN (NEW.id_publicacion,NEW.contenido_especifico_id) AND p.tipo_publicacion='revista')
   OR coalesce(NEW.publicacion_num_web,'') ~* '(VIDRIO|VENTANAS|VPCS|QQ|QUI.N ES QUI.N|HUECO).*(ESPA.A|IBERIA|LATAM|AM.RICA|N[ºO°]|[0-9]$)') THEN RETURN NEW; END IF;
 IF jsonb_typeof(NEW.maquetacion_produccion)<>'object' THEN RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Revisa los datos de maquetación.'; END IF;
 FOREACH kind IN ARRAY ARRAY['articulos','anuncios'] LOOP
  IF NEW.estados_produccion<>'{}'::jsonb AND NOT (NEW.estados_produccion ? kind) THEN CONTINUE; END IF;
  IF NEW.estados_produccion='{}'::jsonb AND NOT (CASE WHEN kind='articulos' THEN coalesce(NEW.tipo_contenido,'') ~* 'art[ií]culo' OR NEW.articulo_origen_id IS NOT NULL ELSE coalesce(NEW.tipo_contenido,'') ~* 'anuncio' END) THEN CONTINUE; END IF;
  next_state=coalesce(NEW.estados_produccion->>kind,NEW.estado_contenido,'');
  previous_state=CASE WHEN TG_OP='UPDATE' THEN coalesce(OLD.estados_produccion->>kind,OLD.estado_contenido,'') ELSE '' END;
  IF next_state='Material OK - pendiente de publicar' AND (previous_state IS DISTINCT FROM next_state OR (TG_OP='UPDATE' AND NEW.maquetacion_produccion->kind IS DISTINCT FROM OLD.maquetacion_produccion->kind)) THEN
   config=NEW.maquetacion_produccion->kind;
   IF config IS NULL OR coalesce(config->>'paginas','') !~ '^[1-9][0-9]{0,3}$'
     OR coalesce(config->>'posicion','') !~ '^(-1|[0-9]{1,3})$'
     OR length(trim(coalesce(config->>'seccion',''))) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Para pasar a fase 6 indica páginas, sección y posición en la revista.';
   END IF;
   IF (config->>'paginas')::int>1000 OR (config->>'posicion')::int+(config->>'paginas')::int>999 THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='La maqueta admite como máximo 1000 páginas físicas.';
   END IF;
   SELECT * INTO material FROM produccion_materiales m WHERE m.id_material=config->>'id_material'
     AND m.id_contenido=NEW.id_contenido AND m.tipo=kind AND m.es_version_acabada
     AND m.eliminado_at IS NULL AND m.material_valido IS DISTINCT FROM false FOR UPDATE;
   IF NOT FOUND OR material.pdf_paginas IS DISTINCT FROM (config->>'paginas')::int THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Para pasar a fase 6 selecciona un PDF final válido con el mismo número de páginas.';
   END IF;
  END IF;
 END LOOP;
 RETURN NEW;
END $$;
COMMENT ON TABLE produccion_maquetas IS 'Estado, extensión y versión de las maquetas impresa y digital de cada número de revista.';
COMMENT ON TABLE produccion_maqueta_contenidos IS 'Posición, sección, extensión y PDF final por contenido, tipo y soporte. No sustituye el planillo previo.';
