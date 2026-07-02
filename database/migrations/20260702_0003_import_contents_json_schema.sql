BEGIN;

ALTER TABLE agentes_db
  ADD COLUMN IF NOT EXISTS nombre_agente TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS apellidos_agente TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nombre_completo_agente TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS dni_agente TEXT,
  ADD COLUMN IF NOT EXISTS rol_agente TEXT,
  ADD COLUMN IF NOT EXISTS estado_agente TEXT;

ALTER TABLE roles_db
  ADD COLUMN IF NOT EXISTS nombre_rol TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS descripcion_rol TEXT,
  ADD COLUMN IF NOT EXISTS permisos_rol JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS estado_rol TEXT;

ALTER TABLE contactos_db
  ADD COLUMN IF NOT EXISTS id_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS nombre_contacto TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS apellidos_contacto TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nombre_completo_contacto TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nombre_empresa TEXT,
  ADD COLUMN IF NOT EXISTS telefono_contacto TEXT,
  ADD COLUMN IF NOT EXISTS email_contacto TEXT,
  ADD COLUMN IF NOT EXISTS cargo_contacto TEXT,
  ADD COLUMN IF NOT EXISTS idiomas TEXT,
  ADD COLUMN IF NOT EXISTS conocido_en TEXT,
  ADD COLUMN IF NOT EXISTS contactado_en_feria TEXT,
  ADD COLUMN IF NOT EXISTS suscripciones JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS otros_datos_interes TEXT,
  ADD COLUMN IF NOT EXISTS pais_contacto TEXT;

ALTER TABLE comentarios_cuentas_db
  ADD COLUMN IF NOT EXISTS id_autor TEXT,
  ADD COLUMN IF NOT EXISTS id_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS fecha_comentario TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contenido_comentario TEXT;

ALTER TABLE comentarios_contactos_db
  ADD COLUMN IF NOT EXISTS id_autor TEXT,
  ADD COLUMN IF NOT EXISTS id_contacto TEXT,
  ADD COLUMN IF NOT EXISTS fecha_comentario TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS contenido_comentario TEXT;

ALTER TABLE propuestas_db
  ADD COLUMN IF NOT EXISTS id_agente_propuesta TEXT,
  ADD COLUMN IF NOT EXISTS estado_propuesta TEXT,
  ADD COLUMN IF NOT EXISTS fecha_envio_propuesta TEXT,
  ADD COLUMN IF NOT EXISTS nombre_propuesta TEXT,
  ADD COLUMN IF NOT EXISTS comentarios_adicionales TEXT,
  ADD COLUMN IF NOT EXISTS forma_cobro_propuesta TEXT,
  ADD COLUMN IF NOT EXISTS descuento_final_propuesta NUMERIC,
  ADD COLUMN IF NOT EXISTS importe_total_bi_propuesta NUMERIC,
  ADD COLUMN IF NOT EXISTS iva_aplicable BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS importe_propuesta_con_iva NUMERIC,
  ADD COLUMN IF NOT EXISTS id_cuenta_propuesta TEXT,
  ADD COLUMN IF NOT EXISTS id_contacto_propuesta TEXT,
  ADD COLUMN IF NOT EXISTS cargo_contacto_propuesta TEXT;

ALTER TABLE lineas_propuestas_db
  ADD COLUMN IF NOT EXISTS id_propuesta TEXT,
  ADD COLUMN IF NOT EXISTS numero_linea_propuesta INTEGER,
  ADD COLUMN IF NOT EXISTS medio TEXT,
  ADD COLUMN IF NOT EXISTS publicacion TEXT,
  ADD COLUMN IF NOT EXISTS producto TEXT,
  ADD COLUMN IF NOT EXISTS precio_tarifa NUMERIC,
  ADD COLUMN IF NOT EXISTS descuento_producto NUMERIC,
  ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC,
  ADD COLUMN IF NOT EXISTS deadline_publicacion TEXT,
  ADD COLUMN IF NOT EXISTS fecha_publicacion_publicacion TEXT;

ALTER TABLE servicios_db
  ADD COLUMN IF NOT EXISTS ano_servicio TEXT,
  ADD COLUMN IF NOT EXISTS soporte_servicio TEXT,
  ADD COLUMN IF NOT EXISTS medio_servicio_es TEXT,
  ADD COLUMN IF NOT EXISTS edicion_servicio_es TEXT,
  ADD COLUMN IF NOT EXISTS publicacion_servicio_es TEXT,
  ADD COLUMN IF NOT EXISTS nombre_servicio_es TEXT,
  ADD COLUMN IF NOT EXISTS medio_servicio_en TEXT,
  ADD COLUMN IF NOT EXISTS edicion_servicio_en TEXT,
  ADD COLUMN IF NOT EXISTS publicacion_servicio_en TEXT,
  ADD COLUMN IF NOT EXISTS nombre_servicio_en TEXT,
  ADD COLUMN IF NOT EXISTS precio_servicio TEXT,
  ADD COLUMN IF NOT EXISTS fecha_deadline_servicio TEXT,
  ADD COLUMN IF NOT EXISTS fecha_publicacion_servicio TEXT;

ALTER TABLE contratos_db
  ADD COLUMN IF NOT EXISTS id_agente_contrato TEXT,
  ADD COLUMN IF NOT EXISTS fecha_cobro_prevista_contrato TEXT,
  ADD COLUMN IF NOT EXISTS forma_cobro_contrato TEXT,
  ADD COLUMN IF NOT EXISTS fecha_firma_contrato TEXT,
  ADD COLUMN IF NOT EXISTS fecha_fin_contrato TEXT,
  ADD COLUMN IF NOT EXISTS id_campana_asociada TEXT,
  ADD COLUMN IF NOT EXISTS descuento_final_contrato NUMERIC,
  ADD COLUMN IF NOT EXISTS importe_total_bi_contrato NUMERIC,
  ADD COLUMN IF NOT EXISTS iva_aplicable BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS importe_contrato_con_iva NUMERIC,
  ADD COLUMN IF NOT EXISTS id_cuenta_contrato TEXT,
  ADD COLUMN IF NOT EXISTS id_contacto_contrato TEXT,
  ADD COLUMN IF NOT EXISTS cargo_contacto_contrato TEXT,
  ADD COLUMN IF NOT EXISTS array_contenidos JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE lineas_contratos_db
  ADD COLUMN IF NOT EXISTS id_contrato TEXT,
  ADD COLUMN IF NOT EXISTS numero_linea_contrato INTEGER,
  ADD COLUMN IF NOT EXISTS medio TEXT,
  ADD COLUMN IF NOT EXISTS publicacion TEXT,
  ADD COLUMN IF NOT EXISTS producto TEXT,
  ADD COLUMN IF NOT EXISTS precio_producto NUMERIC,
  ADD COLUMN IF NOT EXISTS deadline_publicacion TEXT,
  ADD COLUMN IF NOT EXISTS fecha_publicacion_publicacion TEXT,
  ADD COLUMN IF NOT EXISTS estado_material_contrato TEXT,
  ADD COLUMN IF NOT EXISTS url_contenido TEXT;

ALTER TABLE contenidos_db
  ADD COLUMN IF NOT EXISTS id_publicacion TEXT,
  ADD COLUMN IF NOT EXISTS id_cuenta TEXT,
  ADD COLUMN IF NOT EXISTS especificaciones_contenido TEXT,
  ADD COLUMN IF NOT EXISTS id_agente TEXT,
  ADD COLUMN IF NOT EXISTS estado_contenido TEXT,
  ADD COLUMN IF NOT EXISTS deadline_contenido TEXT,
  ADD COLUMN IF NOT EXISTS datos_en_propuesta JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE ordenes_db
  ADD COLUMN IF NOT EXISTS id_contrato TEXT,
  ADD COLUMN IF NOT EXISTS tipo_cobro TEXT,
  ADD COLUMN IF NOT EXISTS id_factura TEXT;

ALTER TABLE cobros
  ADD COLUMN IF NOT EXISTS id_propuesta TEXT,
  ADD COLUMN IF NOT EXISTS numero_cobro INTEGER,
  ADD COLUMN IF NOT EXISTS etiqueta_cobro TEXT,
  ADD COLUMN IF NOT EXISTS fecha_cobro TEXT,
  ADD COLUMN IF NOT EXISTS importe_cobro NUMERIC,
  ADD COLUMN IF NOT EXISTS forma_cobro TEXT;

CREATE TABLE IF NOT EXISTS publicaciones_db (
  id_publicacion TEXT PRIMARY KEY,
  nombre_publicacion TEXT NOT NULL DEFAULT '',
  tematica_edicion TEXT,
  deadline_material TEXT,
  fecha_publicacion TEXT,
  estado_publicacion TEXT,
  medio_publicacion TEXT,
  edicion_publicacion TEXT,
  detalle_publicacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seguimientos_db (
  id_seguimiento TEXT PRIMARY KEY,
  tema_seguimiento TEXT NOT NULL DEFAULT '',
  descripcion_seguimiento TEXT,
  id_agente TEXT,
  link_seguimiento TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS contactos_db_id_cuenta_idx ON contactos_db (id_cuenta);
CREATE INDEX IF NOT EXISTS comentarios_cuentas_db_id_cuenta_idx ON comentarios_cuentas_db (id_cuenta);
CREATE INDEX IF NOT EXISTS comentarios_contactos_db_id_contacto_idx ON comentarios_contactos_db (id_contacto);
CREATE INDEX IF NOT EXISTS lineas_propuestas_db_id_propuesta_idx ON lineas_propuestas_db (id_propuesta);
CREATE INDEX IF NOT EXISTS lineas_contratos_db_id_contrato_idx ON lineas_contratos_db (id_contrato);
CREATE INDEX IF NOT EXISTS contenidos_db_id_publicacion_idx ON contenidos_db (id_publicacion);
CREATE INDEX IF NOT EXISTS ordenes_db_id_contrato_idx ON ordenes_db (id_contrato);
CREATE INDEX IF NOT EXISTS cobros_id_propuesta_idx ON cobros (id_propuesta);

COMMIT;
