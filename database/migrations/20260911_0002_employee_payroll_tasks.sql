CREATE TABLE IF NOT EXISTS nominas_empleados (
  id text PRIMARY KEY,
  id_empleado text NOT NULL UNIQUE REFERENCES agentes_db(id_agente),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION registrar_nomina_empleado() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tipo_cargo = 'nomina' AND NEW.id_agente IS NOT NULL THEN
    INSERT INTO nominas_empleados(id,id_empleado)
    VALUES ('nomina_emp_' || md5(NEW.id_agente), NEW.id_agente)
    ON CONFLICT(id_empleado) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS registrar_nomina_empleado ON cargos_recurrentes;
CREATE TRIGGER registrar_nomina_empleado AFTER INSERT OR UPDATE OF tipo_cargo,id_agente
ON cargos_recurrentes FOR EACH ROW EXECUTE FUNCTION registrar_nomina_empleado();
INSERT INTO nominas_empleados(id,id_empleado)
SELECT DISTINCT 'nomina_emp_' || md5(id_agente),id_agente
FROM cargos_recurrentes WHERE tipo_cargo='nomina' AND id_agente IS NOT NULL
ON CONFLICT(id_empleado) DO NOTHING;

CREATE TABLE IF NOT EXISTS agentes_tareas (
  id text PRIMARY KEY,
  nombre text NOT NULL CHECK(length(trim(nombre)) > 0),
  agente text NOT NULL REFERENCES agentes_db(id_agente) ON DELETE CASCADE,
  estado text NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','en_curso','completada','cancelada')),
  descripcion text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agentes_tareas_agente_idx ON agentes_tareas(agente);
