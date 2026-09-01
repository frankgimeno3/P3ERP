-- Genera un conjunto demostrativo coherente de dos propuestas por cuenta válida.
-- IMPORTANTE: esta migración reemplaza las líneas y cobros de las propuestas incluidas.
-- Es idempotente: los identificadores derivados de md5 son estables y los comentarios
-- se actualizan mediante ON CONFLICT. Todas las comprobaciones se ejecutan antes de COMMIT.

BEGIN;

CREATE TEMP TABLE _proposal_accounts ON COMMIT DROP AS
SELECT
  c.id_cuenta,
  trim(c.nombre_empresa) AS nombre_empresa,
  c.pais_cuenta,
  COALESCE(
    NULLIF(c.id_agente, ''),
    (SELECT a.id_agente
       FROM agentes_db a
      WHERE lower(COALESCE(a.estado_agente, 'activo')) NOT IN ('inactivo', 'baja')
      ORDER BY a.id_agente
      LIMIT 1)
  ) AS id_agente,
  (SELECT x.id_contacto
     FROM contactos_db x
    WHERE x.id_cuenta = c.id_cuenta
    ORDER BY x.created_at NULLS LAST, x.id_contacto
    LIMIT 1) AS id_contacto
FROM cuentas_db c
WHERE trim(COALESCE(c.nombre_empresa, '')) <> ''
  AND trim(c.nombre_empresa) !~ '^[-+]?([0-9]+([.,][0-9]*)?|[.,][0-9]+)$';

DO $$
BEGIN
  IF (SELECT count(*) FROM _proposal_accounts) <> 14 THEN
    RAISE EXCEPTION 'Guard de propuestas: se esperaban 14 cuentas válidas y se encontraron %',
      (SELECT count(*) FROM _proposal_accounts);
  END IF;
  IF EXISTS (SELECT 1 FROM _proposal_accounts WHERE id_contacto IS NULL OR id_agente IS NULL) THEN
    RAISE EXCEPTION 'Guard de propuestas: todas las cuentas deben tener contacto y agente';
  END IF;
END $$;

-- Repara propuestas que apuntan a una cuenta eliminada. La cuenta destino se escoge
-- entre las que tienen menos propuestas y de manera estable por id_cuenta.
WITH orphaned AS (
  SELECT p.id_propuesta, row_number() OVER (ORDER BY p.id_propuesta) AS rn
  FROM propuestas_db p
  LEFT JOIN _proposal_accounts a ON a.id_cuenta = p.id_cuenta_propuesta
  WHERE a.id_cuenta IS NULL
), destinations AS (
  SELECT a.*, row_number() OVER (
    ORDER BY (SELECT count(*) FROM propuestas_db p WHERE p.id_cuenta_propuesta = a.id_cuenta), a.id_cuenta
  ) AS rn
  FROM _proposal_accounts a
), mapping AS (
  SELECT o.id_propuesta, d.id_cuenta, d.id_contacto, d.id_agente
  FROM orphaned o
  JOIN destinations d ON d.rn = 1 + ((o.rn - 1) % (SELECT count(*) FROM destinations))
)
UPDATE propuestas_db p
SET id_cuenta_propuesta = m.id_cuenta,
    id_contacto_propuesta = m.id_contacto,
    id_agente_propuesta = m.id_agente,
    updated_at = now()
FROM mapping m
WHERE p.id_propuesta = m.id_propuesta;

-- Conserva como máximo las dos propuestas más antiguas de cada cuenta. El guard
-- aborta en lugar de borrar si una cuenta ya tuviera más de dos.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM propuestas_db p JOIN _proposal_accounts a ON a.id_cuenta = p.id_cuenta_propuesta
    GROUP BY p.id_cuenta_propuesta HAVING count(*) > 2
  ) THEN
    RAISE EXCEPTION 'Guard de propuestas: existe una cuenta con más de dos propuestas; se requiere revisión manual';
  END IF;
END $$;

CREATE TEMP TABLE _existing_slots ON COMMIT DROP AS
SELECT p.id_cuenta_propuesta AS id_cuenta, p.id_propuesta,
       row_number() OVER (PARTITION BY p.id_cuenta_propuesta ORDER BY p.created_at NULLS LAST, p.id_propuesta) AS slot
FROM propuestas_db p
JOIN _proposal_accounts a ON a.id_cuenta = p.id_cuenta_propuesta;

INSERT INTO propuestas_db (
  id_propuesta, created_at, updated_at, id_agente_propuesta, estado_propuesta,
  fecha_envio_propuesta, nombre_propuesta, comentarios_adicionales,
  descuento_final_propuesta, importe_total_bi_propuesta, iva_aplicable,
  importe_propuesta_con_iva, id_cuenta_propuesta, id_contacto_propuesta,
  fase_propuesta, fecha_validez_propuesta, base_imponible_personalizada,
  es_intercambio, intercambio_precio_final, intercambio_transferencias,
  idioma_propuesta, tipo_descuento_final, moneda
)
SELECT
  'prop_seed_' || substr(md5(a.id_cuenta || ':' || s.slot::text), 1, 24),
  now(), now(), a.id_agente, 'Pendiente', to_char(current_date, 'DD/MM/YYYY'),
  'Propuesta publicitaria - ' || a.nombre_empresa || ' - ' || extract(year FROM current_date)::int || ' - ' || s.slot,
  '', 0, 0,
  lower(translate(COALESCE(a.pais_cuenta, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) IN ('espana', 'spain'),
  0, a.id_cuenta, a.id_contacto, '4', to_char(current_date + 30, 'DD/MM/YYYY'),
  false, false, false, false, 'Español', 'porcentaje', '€'
FROM _proposal_accounts a
CROSS JOIN generate_series(1, 2) AS s(slot)
LEFT JOIN _existing_slots e ON e.id_cuenta = a.id_cuenta AND e.slot = s.slot
WHERE e.id_propuesta IS NULL
ON CONFLICT (id_propuesta) DO NOTHING;

CREATE TEMP TABLE _target_proposals ON COMMIT DROP AS
SELECT p.id_propuesta, a.id_cuenta, a.nombre_empresa, a.pais_cuenta,
       a.id_contacto, a.id_agente,
       row_number() OVER (PARTITION BY a.id_cuenta ORDER BY p.created_at NULLS LAST, p.id_propuesta) AS slot
FROM _proposal_accounts a
JOIN propuestas_db p ON p.id_cuenta_propuesta = a.id_cuenta;

UPDATE propuestas_db p
SET id_contacto_propuesta = t.id_contacto,
    id_agente_propuesta = t.id_agente,
    nombre_propuesta = COALESCE(NULLIF(trim(p.nombre_propuesta), ''),
      'Propuesta publicitaria - ' || t.nombre_empresa || ' - ' || extract(year FROM current_date)::int || ' - ' || t.slot),
    fecha_envio_propuesta = COALESCE(NULLIF(trim(p.fecha_envio_propuesta), ''), to_char(current_date, 'DD/MM/YYYY')),
    fecha_validez_propuesta = COALESCE(NULLIF(trim(p.fecha_validez_propuesta), ''), to_char(current_date + 30, 'DD/MM/YYYY')),
    fase_propuesta = '4',
    estado_propuesta = CASE
      WHEN lower(COALESCE(p.estado_propuesta, '')) IN ('aprobada','aceptada','rechazada') THEN p.estado_propuesta
      ELSE 'Pendiente'
    END,
    idioma_propuesta = COALESCE(NULLIF(p.idioma_propuesta, ''), 'Español'),
    moneda = COALESCE(NULLIF(p.moneda, ''), '€'),
    descuento_final_propuesta = 0,
    tipo_descuento_final = 'porcentaje',
    base_imponible_personalizada = false,
    importe_base_personalizada = NULL,
    es_intercambio = false,
    condiciones_intercambio = '',
    intercambio_precio_final = false,
    intercambio_transferencias = false,
    fecha_pago_proporcion3 = '',
    fecha_pago_contraparte = '',
    importe_intercambio = 0,
    transferencias_intercambio = '[]'::jsonb,
    updated_at = now()
FROM _target_proposals t
WHERE p.id_propuesta = t.id_propuesta;

-- Paquete fijo: dos servicios Iberia, dos América Latina y un quinto servicio
-- de revista. Se eligen solo servicios ofrecibles y con tarifa positiva.
CREATE TEMP TABLE _service_pack ON COMMIT DROP AS
WITH candidates AS (
  SELECT s.*,
    CASE
      WHEN lower(s.edicion_servicio_es) LIKE '%iberia%' THEN 'iberia'
      WHEN lower(translate(s.edicion_servicio_es, 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) LIKE '%america latina%' THEN 'latam'
      ELSE 'otro'
    END AS region,
    row_number() OVER (
      PARTITION BY CASE
        WHEN lower(s.edicion_servicio_es) LIKE '%iberia%' THEN 'iberia'
        WHEN lower(translate(s.edicion_servicio_es, 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) LIKE '%america latina%' THEN 'latam'
        ELSE 'otro'
      END
      ORDER BY s.id_servicio
    ) AS region_row
  FROM servicios_db s
  WHERE lower(trim(COALESCE(s.soporte_servicio, ''))) = 'revista'
    AND lower(COALESCE(s.disponibilidad, 'ofrecible')) = 'ofrecible'
    AND COALESCE(s.precio_tarifa, 0) > 0
), selected AS (
  SELECT * FROM candidates WHERE region IN ('iberia','latam') AND region_row <= 2
  UNION ALL
  SELECT * FROM candidates WHERE region = 'otro' AND region_row = 1
)
SELECT row_number() OVER (ORDER BY CASE region WHEN 'iberia' THEN 1 WHEN 'latam' THEN 2 ELSE 3 END, id_servicio) AS line_no,
       selected.*
FROM selected;

DO $$
BEGIN
  IF (SELECT count(*) FROM _service_pack) <> 5
     OR (SELECT count(*) FROM _service_pack WHERE region = 'iberia') < 2
     OR (SELECT count(*) FROM _service_pack WHERE region = 'latam') < 2 THEN
    RAISE EXCEPTION 'Guard de propuestas: no hay 5 servicios de revista con al menos 2 Iberia y 2 América Latina';
  END IF;
END $$;

DELETE FROM lineas_propuestas_db l
USING _target_proposals p
WHERE l.id_propuesta = p.id_propuesta;

INSERT INTO lineas_propuestas_db (
  id_linea_propuesta, created_at, updated_at, id_propuesta, numero_linea_propuesta,
  medio, publicacion, producto, precio_tarifa, descuento_producto, precio_unitario,
  deadline_publicacion, fecha_publicacion_publicacion, id_servicio, unidades,
  descripcion_linea, especificaciones_linea, modo_precio, precio_total_personalizado,
  tipo_descuento_producto
)
SELECT
  'lin_seed_' || substr(md5(p.id_propuesta || ':' || s.line_no::text), 1, 24),
  now(), now(), p.id_propuesta, s.line_no, s.medio_servicio_es,
  concat_ws(' ', NULLIF(trim(s.edicion_servicio_es), ''), NULLIF(trim(s.publicacion_servicio_es), '')),
  s.nombre_servicio_es, s.precio_tarifa, 0, s.precio_tarifa,
  s.fecha_deadline_servicio, s.fecha_publicacion_servicio, s.id_servicio, 1,
  concat_ws(' ', NULLIF(trim(s.edicion_servicio_es), ''), NULLIF(trim(s.publicacion_servicio_es), '')),
  s.nombre_servicio_es, 'calculado', NULL, 'porcentaje'
FROM _target_proposals p CROSS JOIN _service_pack s;

WITH totals AS (
  SELECT p.id_propuesta, p.pais_cuenta, round(sum(l.precio_unitario * l.unidades), 2) AS base
  FROM _target_proposals p
  JOIN lineas_propuestas_db l ON l.id_propuesta = p.id_propuesta
  GROUP BY p.id_propuesta, p.pais_cuenta
)
UPDATE propuestas_db p
SET importe_total_bi_propuesta = t.base,
    iva_aplicable = lower(translate(COALESCE(t.pais_cuenta, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) IN ('espana','spain'),
    importe_propuesta_con_iva = CASE
      WHEN lower(translate(COALESCE(t.pais_cuenta, ''), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')) IN ('espana','spain')
      THEN round(t.base * 1.21, 2) ELSE t.base END,
    updated_at = now()
FROM totals t WHERE p.id_propuesta = t.id_propuesta;

DELETE FROM cobros_propuestas_db c
USING _target_proposals p
WHERE c.id_propuesta = p.id_propuesta;

-- Dos cobros; el segundo absorbe cualquier céntimo de redondeo.
INSERT INTO cobros_propuestas_db (
  id_cobro_propuesta, id_propuesta, numero_cobro, fecha_cobro,
  importe_cobro, forma_cobro, banco_cobro, observaciones_cobro, created_at, updated_at
)
SELECT 'cob_seed_' || substr(md5(p.id_propuesta || ':' || n::text), 1, 24),
       p.id_propuesta, n,
       to_char(current_date + CASE WHEN n = 1 THEN 15 ELSE 45 END, 'DD/MM/YYYY'),
       CASE WHEN n = 1 THEN round(pr.importe_propuesta_con_iva / 2, 2)
            ELSE pr.importe_propuesta_con_iva - round(pr.importe_propuesta_con_iva / 2, 2) END,
       'Transferencia bancaria',
       CASE WHEN pr.iva_aplicable THEN 'Banco Santander' ELSE 'Banco Sabadell' END,
       'Cobro ' || n || ' de 2', now(), now()
FROM _target_proposals p
JOIN propuestas_db pr ON pr.id_propuesta = p.id_propuesta
CROSS JOIN generate_series(1, 2) n;

INSERT INTO comentarios_db (
  id_comentario, created_at, updated_at, id_original_autor, id_last_editor,
  tipo_entidad, id_entidad, contenido_comentario
)
SELECT
  'com_prop_' || substr(md5(p.id_propuesta), 1, 24), now(), now(), p.id_agente, p.id_agente,
  'cuenta', p.id_cuenta,
  'Propuesta creada por ' || COALESCE(NULLIF(a.nombre_completo_agente, ''), p.id_agente) ||
  ': «' || pr.nombre_propuesta || '», con contenido ' || svc.resumen ||
  ' e importe ' || to_char(pr.importe_propuesta_con_iva, 'FM999999990.00') || ' ' || pr.moneda ||
  ' con 2 pagos que se desglosan así: ' || pay.resumen || '.'
FROM _target_proposals p
JOIN propuestas_db pr ON pr.id_propuesta = p.id_propuesta
LEFT JOIN agentes_db a ON a.id_agente = p.id_agente
CROSS JOIN LATERAL (
  SELECT string_agg(l.producto || ' (' || l.descripcion_linea || ')', '; ' ORDER BY l.numero_linea_propuesta) resumen
  FROM lineas_propuestas_db l WHERE l.id_propuesta = p.id_propuesta
) svc
CROSS JOIN LATERAL (
  SELECT string_agg(to_char(c.importe_cobro, 'FM999999990.00') || ' ' || pr.moneda ||
                    ' el ' || c.fecha_cobro, '; ' ORDER BY c.numero_cobro) resumen
  FROM cobros_propuestas_db c WHERE c.id_propuesta = p.id_propuesta
) pay
ON CONFLICT (id_comentario) DO UPDATE
SET contenido_comentario = EXCLUDED.contenido_comentario,
    id_last_editor = EXCLUDED.id_last_editor,
    updated_at = now();

-- La migración 20260722_0001_propuestas_seguimiento_tareas.sql debe ejecutarse
-- antes que este bloque: aporta propuestas_db.fecha_proxima_gestion,
-- tareas_db.propuesta_id y su índice único parcial.
-- Garantiza una lista General por cada agente involucrado. El identificador estable
-- permite reejecutar este seed sin crear listas nuevas.
INSERT INTO tareas_listas (
  id_lista_tareas, nombre_lista_tareas, id_agente, tareas_order_array,
  orden_lista, created_at, updated_at
)
SELECT
  'lis_general_' || substr(md5(p.id_agente), 1, 20),
  'General', p.id_agente, '[]'::jsonb, 0, now(), now()
FROM (SELECT DISTINCT id_agente FROM _target_proposals) p
WHERE NOT EXISTS (
  SELECT 1 FROM tareas_listas tl
  WHERE tl.id_agente = p.id_agente
    AND lower(trim(tl.nombre_lista_tareas)) = 'general'
)
ON CONFLICT (id_lista_tareas) DO NOTHING;

-- Si la propuesta aún no tiene próxima gestión, se inicializa con su fecha de
-- envío cuando use DD/MM/YYYY o YYYY-MM-DD; ante un legado no interpretable usa hoy.
UPDATE propuestas_db pr
SET fecha_proxima_gestion = COALESCE(
      pr.fecha_proxima_gestion,
      CASE
        WHEN pr.fecha_envio_propuesta ~ '^\d{2}/\d{2}/\d{4}$'
          THEN to_date(pr.fecha_envio_propuesta, 'DD/MM/YYYY')
        WHEN pr.fecha_envio_propuesta ~ '^\d{4}-\d{2}-\d{2}$'
          THEN pr.fecha_envio_propuesta::date
        ELSE current_date
      END
    ),
    updated_at = now()
FROM _target_proposals tp
WHERE pr.id_propuesta = tp.id_propuesta;

CREATE TEMP TABLE _proposal_tasks ON COMMIT DROP AS
SELECT
  tp.id_propuesta,
  tp.id_cuenta,
  tp.id_agente,
  tp.nombre_empresa,
  pr.nombre_propuesta,
  pr.fecha_proxima_gestion,
  COALESCE(NULLIF(trim(pr.acciones_proxima_gestion), ''),
    'Realizar seguimiento de la propuesta ' || pr.nombre_propuesta ||
    ' con ' || tp.nombre_empresa || '.') AS task_content,
  (SELECT tl.id_lista_tareas
     FROM tareas_listas tl
    WHERE tl.id_agente = tp.id_agente
      AND lower(trim(tl.nombre_lista_tareas)) = 'general'
    ORDER BY tl.created_at NULLS LAST, tl.id_lista_tareas
    LIMIT 1) AS id_lista_tareas
FROM _target_proposals tp
JOIN propuestas_db pr ON pr.id_propuesta = tp.id_propuesta;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM _proposal_tasks WHERE id_lista_tareas IS NULL OR fecha_proxima_gestion IS NULL) THEN
    RAISE EXCEPTION 'Guard de tareas: falta lista General o fecha de seguimiento';
  END IF;
END $$;

-- Actualiza cualquier tarea ya vinculada, conservando su PK, y crea únicamente
-- las ausentes. Las fechas de estas tareas siempre proceden de la propuesta.
UPDATE tareas_db t
SET agente = p.id_agente,
    titulo = 'Seguimiento con ' || p.nombre_empresa || ': ' || p.nombre_propuesta,
    contenido = p.task_content,
    descripcion = p.task_content,
    estado = CASE WHEN lower(COALESCE(t.estado, '')) IN ('completada','completado')
                  THEN t.estado ELSE 'pendiente' END,
    prioridad = COALESCE(NULLIF(t.prioridad, ''), 'media'),
    ordenante = 'creada automáticamente',
    lista_tareas = p.id_lista_tareas,
    fecha_desde = p.fecha_proxima_gestion,
    fecha_hasta = p.fecha_proxima_gestion,
    relacionada_con_cuenta = p.id_cuenta,
    updated_at = now()
FROM _proposal_tasks p
WHERE t.propuesta_id = p.id_propuesta;

INSERT INTO tareas_db (
  id_tarea, agente, titulo, contenido, descripcion, estado, prioridad,
  ordenante, lista_tareas, fecha_desde, fecha_hasta,
  relacionada_con_cuenta, propuesta_id, created_at, updated_at
)
SELECT
  'tar_prop_' || substr(md5(p.id_propuesta), 1, 24),
  p.id_agente,
  'Seguimiento con ' || p.nombre_empresa || ': ' || p.nombre_propuesta,
  p.task_content, p.task_content, 'pendiente', 'media',
  'creada automáticamente', p.id_lista_tareas,
  p.fecha_proxima_gestion, p.fecha_proxima_gestion,
  p.id_cuenta, p.id_propuesta, now(), now()
FROM _proposal_tasks p
WHERE NOT EXISTS (
  SELECT 1 FROM tareas_db t WHERE t.propuesta_id = p.id_propuesta
)
ON CONFLICT (id_tarea) DO UPDATE
SET agente = EXCLUDED.agente,
    titulo = EXCLUDED.titulo,
    contenido = EXCLUDED.contenido,
    descripcion = EXCLUDED.descripcion,
    lista_tareas = EXCLUDED.lista_tareas,
    fecha_desde = EXCLUDED.fecha_desde,
    fecha_hasta = EXCLUDED.fecha_hasta,
    relacionada_con_cuenta = EXCLUDED.relacionada_con_cuenta,
    propuesta_id = EXCLUDED.propuesta_id,
    updated_at = now();

DO $$
BEGIN
  IF EXISTS (
    SELECT a.id_cuenta FROM _proposal_accounts a
    LEFT JOIN propuestas_db p ON p.id_cuenta_propuesta = a.id_cuenta
    GROUP BY a.id_cuenta HAVING count(p.id_propuesta) <> 2
  ) THEN RAISE EXCEPTION 'Validación final: no todas las cuentas tienen exactamente dos propuestas'; END IF;

  IF EXISTS (
    SELECT p.id_propuesta FROM _target_proposals p
    LEFT JOIN lineas_propuestas_db l ON l.id_propuesta = p.id_propuesta
    GROUP BY p.id_propuesta
    HAVING count(l.id_linea_propuesta) <> 5
       OR count(*) FILTER (WHERE lower(l.descripcion_linea) LIKE '%iberia%') < 2
       OR count(*) FILTER (WHERE lower(translate(l.descripcion_linea, 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) LIKE '%america latina%') < 2
  ) THEN RAISE EXCEPTION 'Validación final: líneas regionales incompletas'; END IF;

  IF EXISTS (
    SELECT p.id_propuesta FROM _target_proposals p
    JOIN propuestas_db pr ON pr.id_propuesta = p.id_propuesta
    LEFT JOIN cobros_propuestas_db c ON c.id_propuesta = p.id_propuesta
    GROUP BY p.id_propuesta, pr.importe_propuesta_con_iva
    HAVING round(COALESCE(sum(c.importe_cobro), 0), 2) <> round(pr.importe_propuesta_con_iva, 2)
  ) THEN RAISE EXCEPTION 'Validación final: hay cobros descuadrados'; END IF;

  IF EXISTS (
    SELECT 1 FROM propuestas_db pr JOIN _target_proposals p ON p.id_propuesta = pr.id_propuesta
    WHERE pr.es_intercambio IS DISTINCT FROM false OR pr.fase_propuesta <> '4'
      OR pr.id_contacto_propuesta IS NULL OR pr.id_agente_propuesta IS NULL
      OR trim(COALESCE(pr.nombre_propuesta, '')) = ''
      OR trim(COALESCE(pr.fecha_envio_propuesta, '')) = ''
      OR trim(COALESCE(pr.fecha_validez_propuesta, '')) = ''
  ) THEN RAISE EXCEPTION 'Validación final: metadatos obligatorios incompletos'; END IF;

  IF EXISTS (
    SELECT p.id_propuesta
    FROM _target_proposals p
    LEFT JOIN tareas_db t ON t.propuesta_id = p.id_propuesta
    GROUP BY p.id_propuesta
    HAVING count(t.id_tarea) <> 1
  ) THEN RAISE EXCEPTION 'Validación final: cada propuesta debe tener exactamente una tarea vinculada'; END IF;

  IF (SELECT count(*) FROM tareas_db t JOIN _target_proposals p ON p.id_propuesta = t.propuesta_id) <> 28 THEN
    RAISE EXCEPTION 'Validación final: se esperaban 28 tareas de seguimiento vinculadas';
  END IF;
END $$;

COMMIT;
