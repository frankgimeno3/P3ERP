-- Activate after deploying the UI/API that supplies the final PDF and placement.
DROP TRIGGER IF EXISTS p3_require_final_magazine_pdf ON produccion_contenidos;
CREATE TRIGGER p3_require_final_magazine_pdf BEFORE INSERT OR UPDATE OF estado_contenido,estados_produccion,maquetacion_produccion ON produccion_contenidos FOR EACH ROW EXECUTE FUNCTION p3_require_final_magazine_pdf();
