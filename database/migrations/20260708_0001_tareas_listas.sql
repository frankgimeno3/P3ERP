BEGIN;

CREATE TABLE IF NOT EXISTS tareas_listas (
  id_lista_tareas TEXT PRIMARY KEY,
  nombre_lista_tareas TEXT NOT NULL DEFAULT '',
  id_agente TEXT NOT NULL DEFAULT '',
  tareas_order_array JSONB NOT NULL DEFAULT '[]'::jsonb,
  orden_lista INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE tareas_db
  ADD COLUMN IF NOT EXISTS lista_tareas TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS tareas_db_lista_tareas_idx ON tareas_db (lista_tareas);
CREATE INDEX IF NOT EXISTS tareas_listas_agente_idx ON tareas_listas (id_agente);
CREATE INDEX IF NOT EXISTS tareas_listas_orden_idx ON tareas_listas (id_agente, orden_lista);

INSERT INTO tareas_listas (id_lista_tareas, nombre_lista_tareas, id_agente, orden_lista)
SELECT 'lis_general_' || regexp_replace(a.id_agente, '[^a-zA-Z0-9_]+', '_', 'g'), 'general', a.id_agente, 0
FROM agentes_db a
WHERE COALESCE(LOWER(a.estado_agente), '') NOT IN ('inactivo', 'bloqueado', 'archivado')
  AND COALESCE(a.id_agente, '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM tareas_listas tl
    WHERE tl.id_agente = a.id_agente AND LOWER(tl.nombre_lista_tareas) = 'general'
  );

INSERT INTO tareas_listas (id_lista_tareas, nombre_lista_tareas, id_agente, orden_lista)
SELECT 'lis_archivadas_' || regexp_replace(a.id_agente, '[^a-zA-Z0-9_]+', '_', 'g'), 'archivadas', a.id_agente, 999
FROM agentes_db a
WHERE COALESCE(LOWER(a.estado_agente), '') NOT IN ('inactivo', 'bloqueado', 'archivado')
  AND COALESCE(a.id_agente, '') <> ''
  AND NOT EXISTS (
    SELECT 1 FROM tareas_listas tl
    WHERE tl.id_agente = a.id_agente AND LOWER(tl.nombre_lista_tareas) = 'archivadas'
  );

UPDATE tareas_db t
SET lista_tareas = tl.id_lista_tareas
FROM tareas_listas tl
WHERE t.agente = tl.id_agente
  AND LOWER(tl.nombre_lista_tareas) = 'general'
  AND COALESCE(t.lista_tareas, '') = '';

COMMIT;
