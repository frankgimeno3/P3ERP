BEGIN;

ALTER TABLE gestiones_prod_listas
  ADD COLUMN IF NOT EXISTS es_lista_sistema BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS oculta_tablero BOOLEAN NOT NULL DEFAULT FALSE;

INSERT INTO gestiones_prod_listas (
  id_lista_gestiones_prod,
  nombre_lista,
  array_objetos_gestiones,
  posicion_lista,
  es_lista_sistema,
  oculta_tablero
)
VALUES
  ('lista_gestiones_publicado', 'Publicado', '[]'::jsonb, 100000, TRUE, TRUE),
  ('lista_gestiones_cancelado', 'Cancelado', '[]'::jsonb, 100001, TRUE, TRUE)
ON CONFLICT (id_lista_gestiones_prod) DO UPDATE
SET nombre_lista = EXCLUDED.nombre_lista,
    es_lista_sistema = TRUE,
    oculta_tablero = TRUE;

UPDATE gestiones_prod_listas
SET es_lista_sistema = TRUE,
    oculta_tablero = TRUE
WHERE LOWER(nombre_lista) IN ('publicado', 'cancelado');

COMMIT;
