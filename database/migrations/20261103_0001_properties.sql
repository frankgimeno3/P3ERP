-- Inventario de Dirección. Los vínculos no generan otra previsión de gasto.
CREATE TABLE IF NOT EXISTS direccion_propiedades (
 id_propiedad TEXT PRIMARY KEY,
 tipo TEXT NOT NULL CHECK (tipo IN ('parking','vehiculo','otros')),
 nombre TEXT NOT NULL CHECK (length(btrim(nombre)) BETWEEN 1 AND 200),
 identificador TEXT NOT NULL DEFAULT '',
 direccion TEXT NOT NULL DEFAULT '',
 referencia_catastral TEXT NOT NULL DEFAULT '',
 marca TEXT NOT NULL DEFAULT '',
 modelo TEXT NOT NULL DEFAULT '',
 notas TEXT NOT NULL DEFAULT '',
 activo BOOLEAN NOT NULL DEFAULT TRUE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS propiedades_identificador_unique
 ON direccion_propiedades(tipo,lower(btrim(identificador))) WHERE btrim(identificador)<>'';
CREATE UNIQUE INDEX IF NOT EXISTS propiedades_catastral_unique
 ON direccion_propiedades(upper(btrim(referencia_catastral))) WHERE btrim(referencia_catastral)<>'';

CREATE TABLE IF NOT EXISTS direccion_propiedades_cargos (
 id_propiedad TEXT NOT NULL REFERENCES direccion_propiedades(id_propiedad) ON UPDATE CASCADE ON DELETE CASCADE,
 id_cargo_recurrente BIGINT NOT NULL REFERENCES tesoreria_cargos_recurrentes(id_cargo_recurrente) ON UPDATE CASCADE ON DELETE CASCADE,
 estado TEXT NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente','historico')),
 id_regla TEXT NOT NULL DEFAULT '',
 notas TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(id_propiedad,id_cargo_recurrente)
);
CREATE INDEX IF NOT EXISTS propiedades_cargos_cargo_idx ON direccion_propiedades_cargos(id_cargo_recurrente);

CREATE TABLE IF NOT EXISTS direccion_propiedades_movimientos (
 id_propiedad TEXT NOT NULL REFERENCES direccion_propiedades(id_propiedad) ON UPDATE CASCADE ON DELETE CASCADE,
 id_linea_banco TEXT NOT NULL REFERENCES tesoreria_movimientos_bancarios(id_linea_banco) ON UPDATE CASCADE ON DELETE CASCADE,
 relacion TEXT NOT NULL CHECK (relacion IN ('cargo','devolucion','historico','otro')),
 notas TEXT NOT NULL DEFAULT '',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(id_propiedad,id_linea_banco)
);
CREATE INDEX IF NOT EXISTS propiedades_movimientos_banco_idx ON direccion_propiedades_movimientos(id_linea_banco);

-- Un vínculo puede identificar una sola plaza dentro de un cargo agrupado.
-- Impide que la edición posterior de la programación deje ese vínculo huérfano.
CREATE OR REPLACE FUNCTION p3_property_charge_rule_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='direccion_propiedades_cargos' THEN
  IF NEW.id_regla<>'' AND NOT EXISTS(SELECT 1 FROM tesoreria_cargos_recurrentes c,
    jsonb_array_elements(c.programacion) r WHERE c.id_cargo_recurrente=NEW.id_cargo_recurrente AND r->>'id_regla'=NEW.id_regla) THEN
   RAISE EXCEPTION 'La regla no pertenece al cargo previsto' USING ERRCODE='23503';
  END IF;
 ELSE
  IF EXISTS(SELECT 1 FROM direccion_propiedades_cargos l WHERE l.id_cargo_recurrente=NEW.id_cargo_recurrente
    AND l.id_regla<>'' AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(NEW.programacion) r WHERE r->>'id_regla'=l.id_regla)) THEN
   RAISE EXCEPTION 'Desvincula la regla de su propiedad antes de eliminarla del cargo' USING ERRCODE='23503';
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS property_charge_rule_guard ON direccion_propiedades_cargos;
CREATE TRIGGER property_charge_rule_guard BEFORE INSERT OR UPDATE OF id_regla,id_cargo_recurrente ON direccion_propiedades_cargos
 FOR EACH ROW EXECUTE FUNCTION p3_property_charge_rule_guard();
DROP TRIGGER IF EXISTS property_charge_rules_guard ON tesoreria_cargos_recurrentes;
CREATE TRIGGER property_charge_rules_guard BEFORE UPDATE OF programacion ON tesoreria_cargos_recurrentes
 FOR EACH ROW EXECUTE FUNCTION p3_property_charge_rule_guard();

COMMENT ON TABLE direccion_propiedades IS 'Inventario de parkings, vehículos y otras propiedades de la empresa.';
COMMENT ON TABLE direccion_propiedades_cargos IS 'Vínculos vigentes o históricos con cargos existentes. Un cargo compartido no se duplica ni se reparte automáticamente.';
COMMENT ON TABLE direccion_propiedades_movimientos IS 'Evidencia bancaria de una propiedad, incluidos seguros sustituidos y devoluciones. No altera la revisión bancaria.';
-- Obligatorio antes de la primera escritura de las tablas nuevas.
SELECT public.p3_install_user_event_triggers();
