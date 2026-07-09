BEGIN;

ALTER TABLE tareas_db
  ADD COLUMN IF NOT EXISTS descripcion TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fecha_desde DATE,
  ADD COLUMN IF NOT EXISTS fecha_hasta DATE,
  ADD COLUMN IF NOT EXISTS relacionada_con_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS relacionada_con_contacto TEXT,
  ADD COLUMN IF NOT EXISTS relacionada_con_contenido TEXT,
  ADD COLUMN IF NOT EXISTS relacionada_con_feria TEXT,
  ADD COLUMN IF NOT EXISTS relacionada_con_proveedor TEXT;

UPDATE tareas_listas
SET nombre_lista_tareas = 'archivadas',
    updated_at = NOW()
WHERE LOWER(nombre_lista_tareas) IN ('archivada', 'archivado');

COMMIT;
