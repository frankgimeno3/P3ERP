BEGIN;

INSERT INTO grupos_servicios (id_medio, nombre_medio)
VALUES ('suscripcion', 'Suscripción')
ON CONFLICT (id_medio) DO UPDATE
SET nombre_medio = EXCLUDED.nombre_medio,
    updated_at = now();

ALTER TABLE servicios_db
  ADD COLUMN IF NOT EXISTS concepto_factura text NOT NULL DEFAULT '';

UPDATE servicios_db
SET concepto_factura = concat_ws(
      '-',
      NULLIF(medio_servicio_es, ''),
      NULLIF(edicion_servicio_es, ''),
      NULLIF(publicacion_servicio_es, ''),
      NULLIF(nombre_servicio_es, '')
    ),
    updated_at = now()
WHERE NULLIF(concepto_factura, '') IS NULL;

INSERT INTO servicios_db (
  id_servicio,
  id_medio,
  ano_servicio,
  soporte_servicio,
  precio_servicio,
  precio_tarifa,
  fecha_deadline_servicio,
  fecha_publicacion_servicio,
  medio_servicio_es,
  edicion_servicio_es,
  publicacion_servicio_es,
  nombre_servicio_es,
  medio_servicio_en,
  edicion_servicio_en,
  publicacion_servicio_en,
  nombre_servicio_en,
  concepto_factura
)
VALUES
  (
    'suscripcion_nacional',
    'suscripcion',
    '2026',
    '-',
    '',
    NULL,
    '',
    '',
    '-',
    '-',
    '-',
    'suscripcion nacional',
    '-',
    '-',
    '-',
    'national subscription',
    'suscripcion nacional'
  ),
  (
    'suscripcion_europa',
    'suscripcion',
    '2026',
    '-',
    '',
    NULL,
    '',
    '',
    '-',
    '-',
    '-',
    'suscripcion europa',
    '-',
    '-',
    '-',
    'europe subscription',
    'suscripcion europa'
  ),
  (
    'suscripcion_resto_mundo',
    'suscripcion',
    '2026',
    '-',
    '',
    NULL,
    '',
    '',
    '-',
    '-',
    '-',
    'suscripcion resto mundo',
    '-',
    '-',
    '-',
    'rest of world subscription',
    'suscripcion resto mundo'
  )
ON CONFLICT (id_servicio) DO UPDATE
SET id_medio = EXCLUDED.id_medio,
    ano_servicio = EXCLUDED.ano_servicio,
    soporte_servicio = EXCLUDED.soporte_servicio,
    medio_servicio_es = EXCLUDED.medio_servicio_es,
    edicion_servicio_es = EXCLUDED.edicion_servicio_es,
    publicacion_servicio_es = EXCLUDED.publicacion_servicio_es,
    nombre_servicio_es = EXCLUDED.nombre_servicio_es,
    medio_servicio_en = EXCLUDED.medio_servicio_en,
    edicion_servicio_en = EXCLUDED.edicion_servicio_en,
    publicacion_servicio_en = EXCLUDED.publicacion_servicio_en,
    nombre_servicio_en = EXCLUDED.nombre_servicio_en,
    concepto_factura = EXCLUDED.concepto_factura,
    updated_at = now();

COMMIT;
