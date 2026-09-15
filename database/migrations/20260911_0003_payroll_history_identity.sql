CREATE OR REPLACE FUNCTION registrar_nomina_historica() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO nominas_empleados(id,id_empleado)
  VALUES ('nomina_emp_' || md5(NEW.id_empleado),NEW.id_empleado)
  ON CONFLICT(id_empleado) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS registrar_nomina_historica ON nominas;
CREATE TRIGGER registrar_nomina_historica AFTER INSERT OR UPDATE OF id_empleado ON nominas
FOR EACH ROW EXECUTE FUNCTION registrar_nomina_historica();
DROP TRIGGER IF EXISTS registrar_nomina_historica ON anticipos_empleados;
CREATE TRIGGER registrar_nomina_historica AFTER INSERT OR UPDATE OF id_empleado ON anticipos_empleados
FOR EACH ROW EXECUTE FUNCTION registrar_nomina_historica();
INSERT INTO nominas_empleados(id,id_empleado)
SELECT 'nomina_emp_' || md5(id_empleado),id_empleado FROM
(SELECT id_empleado FROM nominas UNION SELECT id_empleado FROM anticipos_empleados) empleados
ON CONFLICT(id_empleado) DO NOTHING;
