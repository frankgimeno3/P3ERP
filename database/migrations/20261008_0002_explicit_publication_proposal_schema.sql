-- Run explicitly before deploying repositories without runtime DDL. Base business tables must already exist.
ALTER TABLE servicios_publicaciones ADD COLUMN IF NOT EXISTS fecha_pedir_materiales TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS deadline_real_materiales TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS fecha_envio_imprenta TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS fecha_estimada_impresion TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS fecha_envio_revistas TEXT NOT NULL DEFAULT '';

ALTER TABLE servicios_revistas
      ADD COLUMN IF NOT EXISTS impresa_o_digital TEXT NOT NULL DEFAULT 'digital';

ALTER TABLE servicios_publicaciones
      ADD COLUMN IF NOT EXISTS tipo_publicacion TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS revista_id TEXT,
      ADD COLUMN IF NOT EXISTS newsletter_id TEXT,
      ADD COLUMN IF NOT EXISTS numero_publicacion TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS version_publicacion TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS deadline_materiales TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS contenido_editorial TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS num_paginas INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS link TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS servicios_paginas_revista (
      id_pagina_publicacion TEXT PRIMARY KEY,
      publication_id TEXT NOT NULL,
      pagina_actual INTEGER NOT NULL,
      has_content BOOLEAN NOT NULL DEFAULT FALSE,
      id_contenido TEXT,
      id_cuenta TEXT,
      nombre_mostrado TEXT NOT NULL DEFAULT '',
      tipo TEXT NOT NULL DEFAULT '',
      pagina_preferente TEXT NOT NULL DEFAULT '',
      ordinal TEXT NOT NULL DEFAULT '1/1',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (publication_id, pagina_actual)
    );

ALTER TABLE servicios_paginas_revista
      ADD COLUMN IF NOT EXISTS nombre_mostrado TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS pagina_preferente TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS ordinal TEXT NOT NULL DEFAULT '1/1';

CREATE INDEX IF NOT EXISTS publicaciones_db_tipo_publicacion_idx ON servicios_publicaciones (tipo_publicacion);

CREATE INDEX IF NOT EXISTS publicaciones_db_revista_id_idx ON servicios_publicaciones (revista_id);

CREATE TABLE IF NOT EXISTS servicios_newsletters (
      id_newsletter TEXT PRIMARY KEY,
      nombre_newsletter TEXT NOT NULL DEFAULT '',
      edicion TEXT NOT NULL DEFAULT '',
      titulo TEXT NOT NULL DEFAULT '',
      descripcion TEXT NOT NULL DEFAULT '',
      estado TEXT NOT NULL DEFAULT 'activo',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

ALTER TABLE servicios_newsletters
      ADD COLUMN IF NOT EXISTS nombre_newsletter TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS edicion TEXT NOT NULL DEFAULT '';

ALTER TABLE servicios_publicaciones
      ADD COLUMN IF NOT EXISTS tipo_publicacion TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS revista_id TEXT,
      ADD COLUMN IF NOT EXISTS newsletter_id TEXT,
      ADD COLUMN IF NOT EXISTS numero_publicacion TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS deadline_materiales TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS link TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS cuenta_id TEXT,
      ADD COLUMN IF NOT EXISTS contenido_id TEXT;

CREATE INDEX IF NOT EXISTS publicaciones_db_newsletter_id_idx ON servicios_publicaciones (newsletter_id);

ALTER TABLE comercial_propuestas_db
    ADD COLUMN IF NOT EXISTS base_imponible_personalizada BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS importe_base_personalizada NUMERIC,
    ADD COLUMN IF NOT EXISTS es_intercambio BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS condiciones_intercambio TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS intercambio_precio_final BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS intercambio_transferencias BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS fecha_pago_proporcion3 TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS fecha_pago_contraparte TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS importe_intercambio NUMERIC NOT NULL DEFAULT 0;

ALTER TABLE comercial_propuestas_db ADD COLUMN IF NOT EXISTS idioma_propuesta TEXT NOT NULL DEFAULT 'es', ADD COLUMN IF NOT EXISTS tipo_descuento_final TEXT NOT NULL DEFAULT 'porcentaje', ADD COLUMN IF NOT EXISTS transferencias_intercambio JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE comercial_propuestas_db ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT '€';

ALTER TABLE comercial_propuestas_db
    ADD COLUMN IF NOT EXISTS comentarios_seguimiento TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS acciones_proxima_gestion TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS fecha_proxima_gestion DATE;

ALTER TABLE comercial_contratos
      ADD COLUMN IF NOT EXISTS nombre_contrato TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS comentarios_adicionales TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS datos_facturacion JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS moneda TEXT NOT NULL DEFAULT 'EUR',
      ADD COLUMN IF NOT EXISTS propuesta_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS id_factura TEXT;

ALTER TABLE comercial_contratos_lineas
      ADD COLUMN IF NOT EXISTS id_linea_propuesta TEXT, ADD COLUMN IF NOT EXISTS id_servicio TEXT,
      ADD COLUMN IF NOT EXISTS id_publicacion TEXT, ADD COLUMN IF NOT EXISTS precio_tarifa NUMERIC NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS descuento_producto NUMERIC NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS tipo_descuento_producto TEXT NOT NULL DEFAULT 'porcentaje',
      ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS unidades NUMERIC NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS descripcion_linea TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS especificaciones_linea TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS modo_precio TEXT NOT NULL DEFAULT 'calculado',
      ADD COLUMN IF NOT EXISTS precio_total_personalizado NUMERIC,
      ADD COLUMN IF NOT EXISTS id_pagina_publicacion TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS linea_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE produccion_contenidos
      ADD COLUMN IF NOT EXISTS id_contrato TEXT, ADD COLUMN IF NOT EXISTS id_linea_contrato TEXT,
      ADD COLUMN IF NOT EXISTS nombre_contenido TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS tipo_contenido TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS fecha_publicacion TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS ano_publicacion TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS servicio TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS contenido_especifico_id TEXT NOT NULL DEFAULT '';

ALTER TABLE comercial_propuestas_lineas ADD COLUMN IF NOT EXISTS id_publicacion TEXT;

ALTER TABLE comercial_propuestas_lineas ADD COLUMN IF NOT EXISTS tipo_descuento_producto TEXT NOT NULL DEFAULT 'porcentaje';

ALTER TABLE comercial_propuestas_lineas ADD COLUMN IF NOT EXISTS especificaciones_linea TEXT NOT NULL DEFAULT '';

ALTER TABLE comercial_propuestas_lineas ADD COLUMN IF NOT EXISTS modo_precio TEXT NOT NULL DEFAULT 'calculado';

ALTER TABLE comercial_propuestas_lineas ADD COLUMN IF NOT EXISTS precio_total_personalizado NUMERIC;

ALTER TABLE comercial_propuestas_lineas ADD COLUMN IF NOT EXISTS id_pagina_publicacion TEXT NOT NULL DEFAULT '';
