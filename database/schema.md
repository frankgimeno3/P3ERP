# RDS Schema Snapshot

Source: PostgreSQL `public` schema from the configured RDS connection.

Update this file whenever tables, columns, primary keys, indexes, or constraints change. For schema changes, also add a SQL migration file under `database/migrations/`.

## Workflow

1. Apply schema changes to RDS with an explicit SQL migration.
2. Add that SQL file under `database/migrations/`.
3. Refresh this snapshot from RDS so table names, column order, keys, defaults, and constraints stay current.

## Tables

### agentes_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_agente | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |
| 4 | nombre_agente | text | NO | ''::text |
| 5 | apellidos_agente | text | NO | ''::text |
| 6 | nombre_completo_agente | text | NO | ''::text |
| 7 | dni_agente | text | YES |  |
| 8 | rol_agente | text | YES |  |
| 9 | estado_agente | text | YES |  |
| 10 | email_agente | text | NO | ''::text |

Constraints:
- PRIMARY KEY agentes_db_pkey: PRIMARY KEY (id_agente)

### comentarios_contactos_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_comentario_contacto | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |
| 4 | id_autor | text | YES |  |
| 5 | id_contacto | text | YES |  |
| 6 | fecha_comentario | timestamp with time zone | YES |  |
| 7 | contenido_comentario | text | YES |  |

Constraints:
- PRIMARY KEY comentarios_contactos_db_pkey: PRIMARY KEY (id_comentario_contacto)

Indexes:
- comentarios_contactos_db_id_contacto_idx: CREATE INDEX comentarios_contactos_db_id_contacto_idx ON public.comentarios_contactos_db USING btree (id_contacto)

### comentarios_cuentas_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_comentario_cuenta | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |
| 4 | id_autor | text | YES |  |
| 5 | id_cuenta | text | YES |  |
| 6 | fecha_comentario | timestamp with time zone | YES |  |
| 7 | contenido_comentario | text | YES |  |

Constraints:
- PRIMARY KEY comentarios_cuentas_db_pkey: PRIMARY KEY (id_comentario_cuenta)

Indexes:
- comentarios_cuentas_db_id_cuenta_idx: CREATE INDEX comentarios_cuentas_db_id_cuenta_idx ON public.comentarios_cuentas_db USING btree (id_cuenta)

### contactos_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_contacto | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |
| 4 | id_cuenta | text | YES |  |
| 5 | nombre_contacto | text | NO | ''::text |
| 6 | apellidos_contacto | text | NO | ''::text |
| 7 | nombre_completo_contacto | text | NO | ''::text |
| 8 | nombre_empresa | text | YES |  |
| 9 | telefono_contacto | text | YES |  |
| 10 | email_contacto | text | YES |  |
| 11 | cargo_contacto | text | YES |  |
| 12 | idiomas | text | YES |  |
| 13 | conocido_en | text | YES |  |
| 14 | contactado_en_feria | text | YES |  |
| 15 | suscripciones | jsonb | NO | '[]'::jsonb |
| 16 | otros_datos_interes | text | YES |  |
| 17 | pais_contacto | text | YES |  |

Constraints:
- PRIMARY KEY contactos_db_pkey: PRIMARY KEY (id_contacto)

Indexes:
- contactos_db_id_cuenta_idx: CREATE INDEX contactos_db_id_cuenta_idx ON public.contactos_db USING btree (id_cuenta)

### contenidos_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_contenido | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |
| 4 | id_publicacion | text | YES |  |
| 5 | id_cuenta | text | YES |  |
| 6 | especificaciones_contenido | text | YES |  |
| 7 | id_agente | text | YES |  |
| 8 | estado_contenido | text | YES |  |
| 9 | deadline_contenido | text | YES |  |
| 10 | datos_en_propuesta | jsonb | NO | '{}'::jsonb |
| 11 | hoja_prod | boolean | NO | true |

Constraints:
- PRIMARY KEY contenidos_db_pkey: PRIMARY KEY (id_contenido)

Indexes:
- contenidos_db_id_publicacion_idx: CREATE INDEX contenidos_db_id_publicacion_idx ON public.contenidos_db USING btree (id_publicacion)
- contenidos_db_hoja_prod_idx: CREATE INDEX contenidos_db_hoja_prod_idx ON public.contenidos_db USING btree (hoja_prod)

### contratos_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_contrato | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |
| 4 | id_agente_contrato | text | YES |  |
| 5 | fecha_cobro_prevista_contrato | text | YES |  |
| 6 | forma_cobro_contrato | text | YES |  |
| 7 | fecha_firma_contrato | text | YES |  |
| 8 | fecha_fin_contrato | text | YES |  |
| 9 | id_campana_asociada | text | YES |  |
| 10 | descuento_final_contrato | numeric | YES |  |
| 11 | importe_total_bi_contrato | numeric | YES |  |
| 12 | iva_aplicable | boolean | NO | false |
| 13 | importe_contrato_con_iva | numeric | YES |  |
| 14 | id_cuenta_contrato | text | YES |  |
| 15 | id_contacto_contrato | text | YES |  |
| 16 | cargo_contacto_contrato | text | YES |  |
| 17 | array_contenidos | jsonb | NO | '[]'::jsonb |
| 18 | array_id_ordenes | jsonb | NO | '[]'::jsonb |

Constraints:
- PRIMARY KEY contratos_db_pkey: PRIMARY KEY (id_contrato)

Indexes:
- contratos_db_array_id_ordenes_idx: CREATE INDEX contratos_db_array_id_ordenes_idx ON public.contratos_db USING gin (array_id_ordenes)

### cuentas_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_cuenta | text | NO |  |
| 2 | nombre_empresa | text | NO | ''::text |
| 3 | pais_cuenta | text | NO | ''::text |
| 4 | id_agente | text | NO | ''::text |
| 5 | id_edisoft | text | NO | ''::text |
| 6 | asignado_a | text | NO | ''::text |
| 7 | receptor_revista | boolean | NO | false |
| 8 | potencial_actual_relacion | text | NO | ''::text |
| 9 | potencial_futuro_encaje | text | NO | ''::text |
| 10 | revisado_ricardo | boolean | NO | false |
| 11 | campanas | text | NO | ''::text |
| 12 | estado_leads_frios | text | NO | ''::text |
| 13 | stands_ferias | text | NO | ''::text |
| 14 | tipo_cuenta | text | NO | ''::text |
| 15 | actividades_cuenta | text | YES |  |
| 16 | descripcion_actividad | text | NO | ''::text |
| 17 | correo_principal | text | NO | ''::text |
| 18 | qq | boolean | NO | false |
| 19 | presente_en_qq | boolean | NO | false |
| 20 | ferias | text | NO | ''::text |
| 21 | red_social_prioritaria | text | NO | ''::text |
| 22 | catalogos | text | NO | ''::text |
| 23 | array_cuentas_distribuidoras | jsonb | NO | '[]'::jsonb |
| 24 | array_cuentas_distribuidas | jsonb | NO | '[]'::jsonb |
| 25 | cuenta_agencia | text | NO | ''::text |
| 26 | fuente_novedades_cuenta | text | YES |  |
| 27 | descripcion_cuenta | text | YES |  |
| 28 | vat_code | text | NO | ''::text |
| 29 | nombre_fiscal | text | NO | ''::text |
| 30 | pais_facturacion | text | NO | ''::text |
| 31 | direccion_facturacion | text | NO | ''::text |
| 32 | mail_contabilidad | text | NO | ''::text |
| 33 | poblacion_facturacion | text | NO | ''::text |
| 34 | cp_facturacion | text | NO | ''::text |
| 35 | detalles_facturacion | text | NO | ''::text |
| 36 | facturas_emitidas | jsonb | NO | '[]'::jsonb |
| 37 | datos_comerciales | jsonb | NO | '{}'::jsonb |
| 38 | array_direcciones_cuenta | jsonb | NO | '[]'::jsonb |
| 39 | array_contactos_cuenta | jsonb | NO | '[]'::jsonb |
| 40 | array_comentarios_cuenta | jsonb | NO | '[]'::jsonb |
| 41 | created_at | timestamp with time zone | NO | now() |
| 42 | updated_at | timestamp with time zone | NO | now() |
| 43 | comentarios_gm | text | NO | ''::text |

Constraints:
- PRIMARY KEY cuentas_db_pkey: PRIMARY KEY (id_cuenta)

Indexes:
- cuentas_db_created_at_idx: CREATE INDEX cuentas_db_created_at_idx ON public.cuentas_db USING btree (created_at)
- cuentas_db_id_agente_idx: CREATE INDEX cuentas_db_id_agente_idx ON public.cuentas_db USING btree (id_agente)
- cuentas_db_nombre_empresa_idx: CREATE INDEX cuentas_db_nombre_empresa_idx ON public.cuentas_db USING btree (nombre_empresa)

### ferias_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_feria | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY ferias_db_pkey: PRIMARY KEY (id_feria)

### facturas_clientes_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_factura_cliente | text | NO |  |
| 2 | id_cuenta | text | YES |  |
| 3 | base_imponible | numeric | YES |  |
| 4 | importe_total | numeric | YES |  |
| 5 | fecha_factura | text | YES |  |
| 6 | comentarios | text | YES |  |
| 7 | created_at | timestamp with time zone | NO | now() |
| 8 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY facturas_clientes_db_pkey: PRIMARY KEY (id_factura_cliente)

Indexes:
- facturas_clientes_db_id_cuenta_idx: CREATE INDEX facturas_clientes_db_id_cuenta_idx ON public.facturas_clientes_db USING btree (id_cuenta)

### facturas_proveedores_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_factura_proveedor | text | NO |  |
| 2 | id_proveedor | text | YES |  |
| 3 | base_imponible | numeric | YES |  |
| 4 | importe_total | numeric | YES |  |
| 5 | fecha_factura | text | YES |  |
| 6 | comentarios | text | YES |  |
| 7 | created_at | timestamp with time zone | NO | now() |
| 8 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY facturas_proveedores_db_pkey: PRIMARY KEY (id_factura_proveedor)

Indexes:
- facturas_proveedores_db_id_proveedor_idx: CREATE INDEX facturas_proveedores_db_id_proveedor_idx ON public.facturas_proveedores_db USING btree (id_proveedor)

### lineas_contratos_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_linea_contrato | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |
| 4 | id_contrato | text | YES |  |
| 5 | numero_linea_contrato | integer | YES |  |
| 6 | medio | text | YES |  |
| 7 | publicacion | text | YES |  |
| 8 | producto | text | YES |  |
| 9 | precio_producto | numeric | YES |  |
| 10 | deadline_publicacion | text | YES |  |
| 11 | fecha_publicacion_publicacion | text | YES |  |
| 12 | estado_material_contrato | text | YES |  |
| 13 | url_contenido | text | YES |  |

Constraints:
- PRIMARY KEY lineas_contratos_db_pkey: PRIMARY KEY (id_linea_contrato)

Indexes:
- lineas_contratos_db_id_contrato_idx: CREATE INDEX lineas_contratos_db_id_contrato_idx ON public.lineas_contratos_db USING btree (id_contrato)

### lineas_propuestas_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_linea_propuesta | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |
| 4 | id_propuesta | text | YES |  |
| 5 | numero_linea_propuesta | integer | YES |  |
| 6 | medio | text | YES |  |
| 7 | publicacion | text | YES |  |
| 8 | producto | text | YES |  |
| 9 | precio_tarifa | numeric | YES |  |
| 10 | descuento_producto | numeric | YES |  |
| 11 | precio_unitario | numeric | YES |  |
| 12 | deadline_publicacion | text | YES |  |
| 13 | fecha_publicacion_publicacion | text | YES |  |

Constraints:
- PRIMARY KEY lineas_propuestas_db_pkey: PRIMARY KEY (id_linea_propuesta)

Indexes:
- lineas_propuestas_db_id_propuesta_idx: CREATE INDEX lineas_propuestas_db_id_propuesta_idx ON public.lineas_propuestas_db USING btree (id_propuesta)

### ordenes_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_orden | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |
| 4 | id_contrato | text | YES |  |
| 5 | id_factura | text | YES |  |
| 6 | numero_cobro | integer | YES |  |
| 7 | etiqueta_cobro | text | YES |  |
| 8 | fecha_teorica_cobro | text | YES |  |
| 9 | fecha_real_cobro | text | YES |  |
| 10 | forma_cobro | text | YES |  |
| 11 | banco_cobro | text | YES |  |
| 12 | base_imponible | numeric | YES |  |
| 13 | cobro_total | numeric | YES |  |

Constraints:
- PRIMARY KEY ordenes_db_pkey: PRIMARY KEY (id_orden)
- CHECK ordenes_db_banco_cobro_check: CHECK (((banco_cobro IS NULL) OR (banco_cobro = ''::text) OR (banco_cobro = ANY (ARRAY['Sabadell'::text, 'Santander'::text]))))

Indexes:
- ordenes_db_id_contrato_idx: CREATE INDEX ordenes_db_id_contrato_idx ON public.ordenes_db USING btree (id_contrato)
- ordenes_db_fecha_teorica_cobro_idx: CREATE INDEX ordenes_db_fecha_teorica_cobro_idx ON public.ordenes_db USING btree (fecha_teorica_cobro)
- ordenes_db_forma_cobro_idx: CREATE INDEX ordenes_db_forma_cobro_idx ON public.ordenes_db USING btree (forma_cobro)

### pagos_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_pago | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |
| 4 | fecha_pago | text | YES |  |
| 5 | bi_pago | numeric | YES |  |
| 6 | total_pago | numeric | YES |  |
| 7 | forma_pago | text | YES |  |
| 8 | cuenta_pago | text | YES |  |
| 9 | id_proveedor | text | YES |  |
| 10 | nombre_planificacion | text | YES |  |
| 11 | descripcion_planificacion | text | YES |  |

Constraints:
- PRIMARY KEY pagos_db_pkey: PRIMARY KEY (id_pago)

Indexes:
- pagos_db_id_proveedor_idx: CREATE INDEX pagos_db_id_proveedor_idx ON public.pagos_db USING btree (id_proveedor)

### propuestas_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_propuesta | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |
| 4 | id_agente_propuesta | text | YES |  |
| 5 | estado_propuesta | text | YES |  |
| 6 | fecha_envio_propuesta | text | YES |  |
| 7 | nombre_propuesta | text | YES |  |
| 8 | comentarios_adicionales | text | YES |  |
| 9 | forma_cobro_propuesta | text | YES |  |
| 10 | descuento_final_propuesta | numeric | YES |  |
| 11 | importe_total_bi_propuesta | numeric | YES |  |
| 12 | iva_aplicable | boolean | NO | false |
| 13 | importe_propuesta_con_iva | numeric | YES |  |
| 14 | id_cuenta_propuesta | text | YES |  |
| 15 | id_contacto_propuesta | text | YES |  |
| 16 | cargo_contacto_propuesta | text | YES |  |

Constraints:
- PRIMARY KEY propuestas_db_pkey: PRIMARY KEY (id_propuesta)

### proveedores_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_proveedor | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |
| 4 | nombre_proveedor | text | NO | ''::text |
| 5 | nombre_fiscal_proveedor | text | NO | ''::text |
| 6 | vat_code | text | NO | ''::text |
| 7 | pais_proveedor | text | NO | ''::text |
| 8 | moneda_proveedor | text | NO | ''::text |

Constraints:
- PRIMARY KEY proveedores_db_pkey: PRIMARY KEY (id_proveedor)

### publicaciones_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_publicacion | text | NO |  |
| 2 | nombre_publicacion | text | NO | ''::text |
| 3 | tematica_edicion | text | YES |  |
| 4 | deadline_material | text | YES |  |
| 5 | fecha_publicacion | text | YES |  |
| 6 | estado_publicacion | text | YES |  |
| 7 | medio_publicacion | text | YES |  |
| 8 | edicion_publicacion | text | YES |  |
| 9 | detalle_publicacion | text | YES |  |
| 10 | created_at | timestamp with time zone | NO | now() |
| 11 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY publicaciones_db_pkey: PRIMARY KEY (id_publicacion)

### registros_bancarios_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_registro_bancario | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY registros_bancarios_db_pkey: PRIMARY KEY (id_registro_bancario)

### remesas_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_remesa | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY remesas_db_pkey: PRIMARY KEY (id_remesa)

### revistas_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_revista | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY revistas_db_pkey: PRIMARY KEY (id_revista)

### grupos_servicios

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_medio | text | NO |  |
| 2 | nombre_medio | text | NO | ''::text |
| 3 | created_at | timestamp with time zone | NO | now() |
| 4 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY grupos_servicios_pkey: PRIMARY KEY (id_medio)

### roles_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_rol | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |
| 4 | nombre_rol | text | NO | ''::text |
| 5 | descripcion_rol | text | YES |  |
| 6 | permisos_rol | jsonb | NO | '[]'::jsonb |
| 7 | estado_rol | text | YES |  |

Constraints:
- PRIMARY KEY roles_db_pkey: PRIMARY KEY (id_rol)

### seguimientos_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_seguimiento | text | NO |  |
| 2 | tema_seguimiento | text | NO | ''::text |
| 3 | descripcion_seguimiento | text | YES |  |
| 4 | id_agente | text | YES |  |
| 5 | link_seguimiento | text | YES |  |
| 6 | created_at | timestamp with time zone | NO | now() |
| 7 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY seguimientos_db_pkey: PRIMARY KEY (id_seguimiento)

### servicios_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_servicio | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |
| 4 | ano_servicio | text | YES |  |
| 5 | soporte_servicio | text | YES |  |
| 6 | medio_servicio_es | text | YES |  |
| 7 | edicion_servicio_es | text | YES |  |
| 8 | publicacion_servicio_es | text | YES |  |
| 9 | nombre_servicio_es | text | YES |  |
| 10 | medio_servicio_en | text | YES |  |
| 11 | edicion_servicio_en | text | YES |  |
| 12 | publicacion_servicio_en | text | YES |  |
| 13 | nombre_servicio_en | text | YES |  |
| 14 | precio_servicio | text | YES |  |
| 15 | fecha_deadline_servicio | text | YES |  |
| 16 | fecha_publicacion_servicio | text | YES |  |
| 17 | id_medio | text | NO | 'otros'::text |
| 18 | precio_tarifa | numeric | YES |  |

Constraints:
- PRIMARY KEY servicios_db_pkey: PRIMARY KEY (id_servicio)
- FOREIGN KEY servicios_db_id_medio_fkey: FOREIGN KEY (id_medio) REFERENCES grupos_servicios(id_medio)

Indexes:
- servicios_db_id_medio_idx: CREATE INDEX servicios_db_id_medio_idx ON public.servicios_db USING btree (id_medio)
