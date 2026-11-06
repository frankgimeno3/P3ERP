SELECT set_config('p3.unified_magazine_initial',(NOT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='produccion_contenidos' AND column_name='formato_revista'))::text,true);
ALTER TABLE servicios_revistas ADD COLUMN IF NOT EXISTS numero_revista text NOT NULL DEFAULT '';
ALTER TABLE servicios_revistas ADD COLUMN IF NOT EXISTS id_numero_revista text REFERENCES servicios_revistas(id_revista) ON UPDATE CASCADE;
ALTER TABLE produccion_contenidos ADD COLUMN IF NOT EXISTS formato_revista text NOT NULL DEFAULT 'impreso_digital';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='produccion_contenidos'::regclass AND conname='contenido_formato_revista_check') THEN
  ALTER TABLE produccion_contenidos ADD CONSTRAINT contenido_formato_revista_check CHECK(formato_revista IN ('impreso','digital','impreso_digital'));
 END IF;
END $$;
SELECT public.p3_install_user_event_triggers();
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM servicios_publicaciones WHERE revista_id IS NOT NULL GROUP BY revista_id HAVING count(DISTINCT NULLIF(btrim(numero_publicacion),''))>1) THEN
  RAISE EXCEPTION 'Una revista histórica contiene varios números; revisa su identidad antes de unificar.';
 END IF;
END $$;
UPDATE servicios_revistas r SET numero_revista=p.numero FROM (SELECT revista_id,max(btrim(numero_publicacion)) numero FROM servicios_publicaciones WHERE revista_id IS NOT NULL GROUP BY revista_id) p
 WHERE r.id_revista=p.revista_id AND r.numero_revista IS DISTINCT FROM p.numero;
WITH issues AS (
 SELECT id_revista,first_value(id_revista) OVER(PARTITION BY lower(btrim(revista)),lower(btrim(edicion)),lower(btrim(especial)),numero_revista ORDER BY (id_revista ~ '_impresa$'),id_revista) principal
 FROM servicios_revistas WHERE numero_revista<>''
) UPDATE servicios_revistas r SET id_numero_revista=CASE WHEN i.principal=r.id_revista THEN NULL ELSE i.principal END
 FROM issues i WHERE r.id_revista=i.id_revista AND r.id_numero_revista IS DISTINCT FROM CASE WHEN i.principal=r.id_revista THEN NULL ELSE i.principal END;
CREATE UNIQUE INDEX IF NOT EXISTS revista_numero_unico ON servicios_revistas(lower(btrim(revista)),lower(btrim(edicion)),lower(btrim(especial)),numero_revista) WHERE id_numero_revista IS NULL AND numero_revista<>'';
CREATE INDEX IF NOT EXISTS revista_numero_alias_idx ON servicios_revistas(id_numero_revista);
CREATE OR REPLACE FUNCTION p3_magazine_issue_id(value text) RETURNS text LANGUAGE sql STABLE AS $$
 SELECT COALESCE(r.id_numero_revista,r.id_revista) FROM servicios_revistas r
 WHERE r.id_revista=value OR EXISTS(SELECT 1 FROM servicios_publicaciones p WHERE p.id_publicacion=value AND p.revista_id=r.id_revista)
 ORDER BY (r.id_revista=value) DESC LIMIT 1
$$;
-- El formato del contenido contratado parte siempre de impreso + digital.
-- Las referencias históricas a publicaciones y sus importes se conservan.
UPDATE produccion_contenidos c SET formato_revista=CASE
 WHEN NULLIF(c.id_contrato,'') IS NOT NULL OR EXISTS(SELECT 1 FROM comercial_contratos ct WHERE ct.array_contenidos @> jsonb_build_array(jsonb_build_object('id_contenido',c.id_contenido))) THEN 'impreso_digital'
 WHEN c.tipo_revista_servicio ~* 'impres' AND c.tipo_revista_servicio !~* 'digital' THEN 'impreso'
 WHEN c.tipo_revista_servicio ~* 'digital' AND c.tipo_revista_servicio !~* 'impres' THEN 'digital'
 WHEN EXISTS(SELECT 1 FROM servicios_publicaciones p WHERE p.id_publicacion IN(c.id_publicacion,c.contenido_especifico_id) AND p.version_publicacion ~* 'digital')
  AND NOT EXISTS(SELECT 1 FROM servicios_publicaciones p WHERE p.id_publicacion IN(c.id_publicacion,c.contenido_especifico_id) AND p.version_publicacion ~* 'impres') THEN 'digital'
 WHEN EXISTS(SELECT 1 FROM servicios_publicaciones p WHERE p.id_publicacion IN(c.id_publicacion,c.contenido_especifico_id) AND p.version_publicacion ~* 'impres')
  AND NOT EXISTS(SELECT 1 FROM servicios_publicaciones p WHERE p.id_publicacion IN(c.id_publicacion,c.contenido_especifico_id) AND p.version_publicacion ~* 'digital') THEN 'impreso'
 ELSE 'impreso_digital' END
 WHERE current_setting('p3.unified_magazine_initial')::boolean AND c.formato_revista='impreso_digital';
UPDATE servicios_publicaciones p SET revista_id=r.id_numero_revista,updated_at=clock_timestamp() FROM servicios_revistas r WHERE p.revista_id=r.id_revista AND r.id_numero_revista IS NOT NULL;
INSERT INTO produccion_revistas_contenidos(id_revista,id_contenido,tipo)
 SELECT DISTINCT r.id_numero_revista,l.id_contenido,l.tipo FROM produccion_revistas_contenidos l JOIN servicios_revistas r USING(id_revista) WHERE r.id_numero_revista IS NOT NULL ON CONFLICT DO NOTHING;
DELETE FROM produccion_revistas_contenidos l USING servicios_revistas r WHERE l.id_revista=r.id_revista AND r.id_numero_revista IS NOT NULL;
UPDATE produccion_materiales m SET id_revista=r.id_numero_revista FROM servicios_revistas r WHERE m.id_revista=r.id_revista AND r.id_numero_revista IS NOT NULL;
UPDATE contenidos_revistas_db c SET revista_id=r.id_numero_revista FROM servicios_revistas r WHERE c.revista_id=r.id_revista AND r.id_numero_revista IS NOT NULL;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM produccion_planillos_previos a JOIN servicios_revistas r ON r.id_revista=a.id_revista JOIN produccion_planillos_previos b ON b.id_revista=r.id_numero_revista WHERE a.plan IS DISTINCT FROM b.plan) THEN
  RAISE EXCEPTION 'Hay planillos distintos en las dos versiones del mismo número; deben reconciliarse antes de unificar.';
 END IF;
END $$;
UPDATE produccion_planillos_previos p SET id_revista=r.id_numero_revista FROM servicios_revistas r WHERE p.id_revista=r.id_revista AND r.id_numero_revista IS NOT NULL AND NOT EXISTS(SELECT 1 FROM produccion_planillos_previos target WHERE target.id_revista=r.id_numero_revista);
COMMENT ON COLUMN servicios_revistas.id_numero_revista IS 'Alias histórico de un número unificado; NULL identifica el número principal. No representa otro formato de revista.';
COMMENT ON COLUMN servicios_revistas.numero_revista IS 'Número editorial único por revista, edición y especial; el formato pertenece a cada contenido.';
COMMENT ON COLUMN produccion_contenidos.formato_revista IS 'Formato del contenido: impreso, digital o impreso_digital. Todo contenido por contrato parte de impreso_digital.';
CREATE OR REPLACE FUNCTION p3_magazine_publication_issue_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE issue_id text; issue_number text;
BEGIN
 IF NEW.revista_id IS NULL OR NEW.revista_id='' THEN RETURN NEW; END IF;
 SELECT COALESCE(id_numero_revista,id_revista),numero_revista INTO issue_id,issue_number FROM servicios_revistas WHERE id_revista=NEW.revista_id FOR UPDATE;
 IF issue_id IS NULL THEN RAISE EXCEPTION 'Número de revista no encontrado' USING ERRCODE='23503'; END IF;
 NEW.revista_id:=issue_id;
 IF COALESCE(NEW.numero_publicacion,'')<>'' THEN
  IF COALESCE(issue_number,'')='' THEN UPDATE servicios_revistas SET numero_revista=btrim(NEW.numero_publicacion) WHERE id_revista=issue_id;
  ELSIF btrim(NEW.numero_publicacion)<>issue_number THEN RAISE EXCEPTION 'La publicación debe conservar el número de su revista'; END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS magazine_publication_issue_guard ON servicios_publicaciones;
CREATE TRIGGER magazine_publication_issue_guard BEFORE INSERT OR UPDATE OF revista_id,numero_publicacion ON servicios_publicaciones FOR EACH ROW EXECUTE FUNCTION p3_magazine_publication_issue_guard();
