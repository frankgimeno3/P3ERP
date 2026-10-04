-- Default only when missing: an explicit later choice of bank is respected.
CREATE OR REPLACE FUNCTION p3_receipt_default_bank() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF COALESCE(NEW.forma_cobro,'') ~* '(recibo|remesa)' AND NULLIF(btrim(NEW.banco_cobro),'') IS NULL THEN
  NEW.banco_cobro := 'Sabadell';
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS receipt_default_bank ON tesoreria_ordenes;
CREATE TRIGGER receipt_default_bank BEFORE INSERT OR UPDATE OF forma_cobro,banco_cobro
 ON tesoreria_ordenes FOR EACH ROW EXECUTE FUNCTION p3_receipt_default_bank();
