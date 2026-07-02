BEGIN;

ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS id_edisoft text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS asignado_a text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS receptor_revista boolean NOT NULL DEFAULT false;
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS potencial_actual_relacion text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS potencial_futuro_encaje text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS revisado_ricardo boolean NOT NULL DEFAULT false;
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS campanas text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS estado_leads_frios text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS stands_ferias text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS tipo_cuenta text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS descripcion_actividad text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS correo_principal text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS qq boolean NOT NULL DEFAULT false;
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS ferias text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS red_social_prioritaria text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS catalogos text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS array_cuentas_distribuidoras jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS array_cuentas_distribuidas jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS cuenta_agencia text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS vat_code text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS nombre_fiscal text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS pais_facturacion text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS direccion_facturacion text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS mail_contabilidad text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS poblacion_facturacion text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS cp_facturacion text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS detalles_facturacion text NOT NULL DEFAULT '';
ALTER TABLE cuentas_db ADD COLUMN IF NOT EXISTS facturas_emitidas jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS cuentas_db_reordered (
  id_cuenta text PRIMARY KEY,
  nombre_empresa text NOT NULL DEFAULT '',
  pais_cuenta text NOT NULL DEFAULT '',
  id_agente text NOT NULL DEFAULT '',
  id_edisoft text NOT NULL DEFAULT '',
  asignado_a text NOT NULL DEFAULT '',
  receptor_revista boolean NOT NULL DEFAULT false,
  potencial_actual_relacion text NOT NULL DEFAULT '',
  potencial_futuro_encaje text NOT NULL DEFAULT '',
  revisado_ricardo boolean NOT NULL DEFAULT false,
  campanas text NOT NULL DEFAULT '',
  estado_leads_frios text NOT NULL DEFAULT '',
  stands_ferias text NOT NULL DEFAULT '',
  tipo_cuenta text NOT NULL DEFAULT '',
  actividades_cuenta text,
  descripcion_actividad text NOT NULL DEFAULT '',
  correo_principal text NOT NULL DEFAULT '',
  qq boolean NOT NULL DEFAULT false,
  presente_en_qq boolean NOT NULL DEFAULT false,
  ferias text NOT NULL DEFAULT '',
  red_social_prioritaria text NOT NULL DEFAULT '',
  catalogos text NOT NULL DEFAULT '',
  array_cuentas_distribuidoras jsonb NOT NULL DEFAULT '[]'::jsonb,
  array_cuentas_distribuidas jsonb NOT NULL DEFAULT '[]'::jsonb,
  cuenta_agencia text NOT NULL DEFAULT '',
  fuente_novedades_cuenta text,
  descripcion_cuenta text,
  vat_code text NOT NULL DEFAULT '',
  nombre_fiscal text NOT NULL DEFAULT '',
  pais_facturacion text NOT NULL DEFAULT '',
  direccion_facturacion text NOT NULL DEFAULT '',
  mail_contabilidad text NOT NULL DEFAULT '',
  poblacion_facturacion text NOT NULL DEFAULT '',
  cp_facturacion text NOT NULL DEFAULT '',
  detalles_facturacion text NOT NULL DEFAULT '',
  facturas_emitidas jsonb NOT NULL DEFAULT '[]'::jsonb,
  datos_comerciales jsonb NOT NULL DEFAULT '{}'::jsonb,
  array_direcciones_cuenta jsonb NOT NULL DEFAULT '[]'::jsonb,
  array_contactos_cuenta jsonb NOT NULL DEFAULT '[]'::jsonb,
  array_comentarios_cuenta jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO cuentas_db_reordered (
  id_cuenta,
  nombre_empresa,
  pais_cuenta,
  id_agente,
  id_edisoft,
  asignado_a,
  receptor_revista,
  potencial_actual_relacion,
  potencial_futuro_encaje,
  revisado_ricardo,
  campanas,
  estado_leads_frios,
  stands_ferias,
  tipo_cuenta,
  actividades_cuenta,
  descripcion_actividad,
  correo_principal,
  qq,
  presente_en_qq,
  ferias,
  red_social_prioritaria,
  catalogos,
  array_cuentas_distribuidoras,
  array_cuentas_distribuidas,
  cuenta_agencia,
  fuente_novedades_cuenta,
  descripcion_cuenta,
  vat_code,
  nombre_fiscal,
  pais_facturacion,
  direccion_facturacion,
  mail_contabilidad,
  poblacion_facturacion,
  cp_facturacion,
  detalles_facturacion,
  facturas_emitidas,
  datos_comerciales,
  array_direcciones_cuenta,
  array_contactos_cuenta,
  array_comentarios_cuenta,
  created_at,
  updated_at
)
SELECT
  id_cuenta,
  nombre_empresa,
  pais_cuenta,
  id_agente,
  COALESCE(id_edisoft, ''),
  COALESCE(asignado_a, id_agente, ''),
  COALESCE(receptor_revista, false),
  COALESCE(potencial_actual_relacion, ''),
  COALESCE(potencial_futuro_encaje, ''),
  COALESCE(revisado_ricardo, false),
  COALESCE(campanas, ''),
  COALESCE(estado_leads_frios, ''),
  COALESCE(stands_ferias, ''),
  COALESCE(tipo_cuenta, ''),
  actividades_cuenta,
  COALESCE(descripcion_actividad, ''),
  COALESCE(correo_principal, ''),
  COALESCE(qq, presente_en_qq, false),
  presente_en_qq,
  COALESCE(ferias, ''),
  COALESCE(red_social_prioritaria, ''),
  COALESCE(catalogos, ''),
  COALESCE(array_cuentas_distribuidoras, '[]'::jsonb),
  COALESCE(array_cuentas_distribuidas, '[]'::jsonb),
  COALESCE(cuenta_agencia, ''),
  fuente_novedades_cuenta,
  descripcion_cuenta,
  COALESCE(vat_code, ''),
  COALESCE(nombre_fiscal, nombre_empresa, ''),
  COALESCE(pais_facturacion, pais_cuenta, ''),
  COALESCE(direccion_facturacion, ''),
  COALESCE(mail_contabilidad, ''),
  COALESCE(poblacion_facturacion, ''),
  COALESCE(cp_facturacion, ''),
  COALESCE(detalles_facturacion, ''),
  COALESCE(facturas_emitidas, '[]'::jsonb),
  datos_comerciales,
  array_direcciones_cuenta,
  array_contactos_cuenta,
  array_comentarios_cuenta,
  created_at,
  updated_at
FROM cuentas_db
ON CONFLICT (id_cuenta) DO NOTHING;

DROP TABLE cuentas_db;
ALTER TABLE cuentas_db_reordered RENAME TO cuentas_db;
ALTER TABLE cuentas_db RENAME CONSTRAINT cuentas_db_reordered_pkey TO cuentas_db_pkey;

CREATE INDEX IF NOT EXISTS cuentas_db_created_at_idx ON cuentas_db (created_at);
CREATE INDEX IF NOT EXISTS cuentas_db_id_agente_idx ON cuentas_db (id_agente);
CREATE INDEX IF NOT EXISTS cuentas_db_nombre_empresa_idx ON cuentas_db (nombre_empresa);

UPDATE cuentas_db
SET
  id_edisoft = CASE id_cuenta
    WHEN '62500001' THEN 'EDI-TVITEC-001'
    WHEN '62500002' THEN 'EDI-METALES-002'
    WHEN '62500003' THEN 'EDI-PLASTICOS-003'
    ELSE id_edisoft
  END,
  asignado_a = CASE id_cuenta
    WHEN '62500001' THEN 'Equipo comercial norte'
    WHEN '62500002' THEN 'Equipo comercial industria'
    WHEN '62500003' THEN 'Equipo comercial sur'
    ELSE asignado_a
  END,
  receptor_revista = CASE id_cuenta
    WHEN '62500001' THEN true
    WHEN '62500002' THEN false
    WHEN '62500003' THEN true
    ELSE receptor_revista
  END,
  potencial_actual_relacion = CASE id_cuenta
    WHEN '62500001' THEN 'Cliente'
    WHEN '62500002' THEN 'Neutral - Intentando contactar con responsable'
    WHEN '62500003' THEN 'Altas Posibilidades - buena relación con el responsable'
    ELSE potencial_actual_relacion
  END,
  potencial_futuro_encaje = CASE id_cuenta
    WHEN '62500001' THEN 'Máximo - Cliente nuestro y-o anunciante competencia'
    WHEN '62500002' THEN 'Alto - Encaja por sector y por mercado'
    WHEN '62500003' THEN 'Neutral - no determinado'
    ELSE potencial_futuro_encaje
  END,
  revisado_ricardo = CASE id_cuenta
    WHEN '62500001' THEN true
    WHEN '62500002' THEN false
    WHEN '62500003' THEN true
    ELSE revisado_ricardo
  END,
  campanas = CASE id_cuenta
    WHEN '62500001' THEN 'Campaña vidrio 2026'
    WHEN '62500002' THEN 'Prospección industria metal'
    WHEN '62500003' THEN 'Campaña packaging sur'
    ELSE campanas
  END,
  estado_leads_frios = CASE id_cuenta
    WHEN '62500001' THEN 'No aplica'
    WHEN '62500002' THEN 'Pendiente de llamada'
    WHEN '62500003' THEN 'Seguimiento activo'
    ELSE estado_leads_frios
  END,
  stands_ferias = CASE id_cuenta
    WHEN '62500001' THEN 'GlassTech Madrid, stand B12'
    WHEN '62500002' THEN 'MetalMadrid, pendiente confirmar stand'
    WHEN '62500003' THEN 'Packaging Premiere, stand C08'
    ELSE stands_ferias
  END,
  tipo_cuenta = CASE id_cuenta
    WHEN '62500001' THEN 'Fabricante'
    WHEN '62500002' THEN 'Proveedor industrial'
    WHEN '62500003' THEN 'Transformador'
    ELSE tipo_cuenta
  END,
  descripcion_actividad = CASE id_cuenta
    WHEN '62500001' THEN 'Producción y transformación de vidrio arquitectónico.'
    WHEN '62500002' THEN 'Suministro y mecanizado de componentes metálicos.'
    WHEN '62500003' THEN 'Fabricación de soluciones plásticas para embalaje.'
    ELSE descripcion_actividad
  END,
  correo_principal = CASE id_cuenta
    WHEN '62500001' THEN 'marketing@tvitec.example'
    WHEN '62500002' THEN 'comercial@metalesunidos.example'
    WHEN '62500003' THEN 'info@plasticosdelsur.example'
    ELSE correo_principal
  END,
  qq = CASE id_cuenta
    WHEN '62500001' THEN true
    WHEN '62500002' THEN false
    WHEN '62500003' THEN true
    ELSE qq
  END,
  ferias = CASE id_cuenta
    WHEN '62500001' THEN 'Veteco, GlassTech'
    WHEN '62500002' THEN 'MetalMadrid'
    WHEN '62500003' THEN 'Hispack, Packaging Premiere'
    ELSE ferias
  END,
  red_social_prioritaria = CASE id_cuenta
    WHEN '62500001' THEN 'LinkedIn'
    WHEN '62500002' THEN 'LinkedIn'
    WHEN '62500003' THEN 'Instagram'
    ELSE red_social_prioritaria
  END,
  catalogos = CASE id_cuenta
    WHEN '62500001' THEN 'Catálogo vidrio arquitectónico 2026'
    WHEN '62500002' THEN 'Catálogo industrial general'
    WHEN '62500003' THEN 'Catálogo envases sostenibles'
    ELSE catalogos
  END,
  array_cuentas_distribuidoras = CASE id_cuenta
    WHEN '62500001' THEN '[{"id_cuenta":"62500002","nombre_empresa":"Metales Unidos"}]'::jsonb
    WHEN '62500002' THEN '[]'::jsonb
    WHEN '62500003' THEN '[{"id_cuenta":"62500001","nombre_empresa":"TVITEC"}]'::jsonb
    ELSE array_cuentas_distribuidoras
  END,
  array_cuentas_distribuidas = CASE id_cuenta
    WHEN '62500001' THEN '[]'::jsonb
    WHEN '62500002' THEN '[{"id_cuenta":"62500001","nombre_empresa":"TVITEC"}]'::jsonb
    WHEN '62500003' THEN '[]'::jsonb
    ELSE array_cuentas_distribuidas
  END,
  cuenta_agencia = CASE id_cuenta
    WHEN '62500001' THEN 'No'
    WHEN '62500002' THEN 'No'
    WHEN '62500003' THEN 'Agencia externa sur'
    ELSE cuenta_agencia
  END,
  vat_code = CASE id_cuenta
    WHEN '62500001' THEN 'ESB62500001'
    WHEN '62500002' THEN 'ESB62500002'
    WHEN '62500003' THEN 'ESB62500003'
    ELSE vat_code
  END,
  nombre_fiscal = CASE id_cuenta
    WHEN '62500001' THEN 'TVITEC System Glass S.L.'
    WHEN '62500002' THEN 'Metales Unidos S.L.'
    WHEN '62500003' THEN 'Plásticos del Sur S.L.'
    ELSE nombre_fiscal
  END,
  pais_facturacion = CASE id_cuenta
    WHEN '62500001' THEN 'España'
    WHEN '62500002' THEN 'España'
    WHEN '62500003' THEN 'España'
    ELSE pais_facturacion
  END,
  direccion_facturacion = CASE id_cuenta
    WHEN '62500001' THEN 'Polígono industrial, nave 12'
    WHEN '62500002' THEN 'Calle Industria 22'
    WHEN '62500003' THEN 'Avenida del Embalaje 8'
    ELSE direccion_facturacion
  END,
  mail_contabilidad = CASE id_cuenta
    WHEN '62500001' THEN 'contabilidad@tvitec.example'
    WHEN '62500002' THEN 'facturas@metalesunidos.example'
    WHEN '62500003' THEN 'administracion@plasticosdelsur.example'
    ELSE mail_contabilidad
  END,
  poblacion_facturacion = CASE id_cuenta
    WHEN '62500001' THEN 'Ponferrada'
    WHEN '62500002' THEN 'Madrid'
    WHEN '62500003' THEN 'Sevilla'
    ELSE poblacion_facturacion
  END,
  cp_facturacion = CASE id_cuenta
    WHEN '62500001' THEN '24400'
    WHEN '62500002' THEN '28021'
    WHEN '62500003' THEN '41016'
    ELSE cp_facturacion
  END,
  detalles_facturacion = CASE id_cuenta
    WHEN '62500001' THEN 'Enviar factura por email con pedido interno.'
    WHEN '62500002' THEN 'Requiere referencia de campaña en factura.'
    WHEN '62500003' THEN 'Facturación mensual agrupada.'
    ELSE detalles_facturacion
  END,
  facturas_emitidas = CASE id_cuenta
    WHEN '62500001' THEN '[{"id_factura":"F-2026-001","fecha":"2026-01-15","importe":2400}]'::jsonb
    WHEN '62500002' THEN '[{"id_factura":"F-2026-002","fecha":"2026-02-03","importe":980}]'::jsonb
    WHEN '62500003' THEN '[{"id_factura":"F-2026-003","fecha":"2026-03-10","importe":1750}]'::jsonb
    ELSE facturas_emitidas
  END,
  updated_at = now();

COMMIT;
