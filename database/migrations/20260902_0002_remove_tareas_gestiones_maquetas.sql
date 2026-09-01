BEGIN;

DROP TABLE IF EXISTS tareas_listas CASCADE;
DROP TABLE IF EXISTS tareas_db CASCADE;
DROP TABLE IF EXISTS campanas_comerciales CASCADE;
DROP TABLE IF EXISTS gestiones_prod_listas CASCADE;
DROP TABLE IF EXISTS gestiones_produccion_db CASCADE;
DROP TABLE IF EXISTS revistas_articulos CASCADE;

ALTER TABLE contenidos_db DROP COLUMN IF EXISTS id_gestion_prod;
ALTER TABLE contratos_db DROP COLUMN IF EXISTS id_campana_asociada;

COMMIT;
