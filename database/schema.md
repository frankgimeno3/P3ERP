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
| 18 | linkedin_cuenta | text | NO | ''::text |
| 19 | url_contacto | text | NO | ''::text |

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
| 5 | website | text | NO | ''::text |
| 6 | id_edisoft | text | NO | ''::text |
| 7 | asignado_a | text | NO | ''::text |
| 8 | receptor_revista | boolean | NO | false |
| 9 | potencial_actual_relacion | text | NO | ''::text |
| 10 | potencial_futuro_encaje | text | NO | ''::text |
| 11 | revisado_ricardo | boolean | NO | false |
| 12 | campanas | text | NO | ''::text |
| 13 | estado_leads_frios | text | NO | ''::text |
| 14 | stands_ferias | text | NO | ''::text |
| 15 | tipo_cuenta | text | NO | ''::text |
| 16 | actividades_cuenta | text | YES |  |
| 17 | descripcion_actividad | text | NO | ''::text |
| 18 | correo_principal | text | NO | ''::text |
| 19 | qq | boolean | NO | false |
| 20 | presente_en_qq | boolean | NO | false |
| 21 | ferias | text | NO | ''::text |
| 22 | red_social_prioritaria | text | NO | ''::text |
| 23 | catalogos | text | NO | ''::text |
| 24 | array_cuentas_distribuidoras | jsonb | NO | '[]'::jsonb |
| 25 | array_cuentas_distribuidas | jsonb | NO | '[]'::jsonb |
| 26 | cuenta_agencia | text | NO | ''::text |
| 27 | fuente_novedades_cuenta | text | YES |  |
| 28 | descripcion_cuenta | text | YES |  |
| 29 | vat_code | text | NO | ''::text |
| 30 | identificador_fiscal_tipo | text | NO | ''::text |
| 31 | cif | text | NO | ''::text |
| 32 | nombre_fiscal | text | NO | ''::text |
| 33 | pais_facturacion | text | NO | ''::text |
| 34 | direccion_facturacion | text | NO | ''::text |
| 35 | mail_contabilidad | text | NO | ''::text |
| 36 | poblacion_facturacion | text | NO | ''::text |
| 37 | cp_facturacion | text | NO | ''::text |
| 38 | detalles_facturacion | text | NO | ''::text |
| 39 | facturas_emitidas | jsonb | NO | '[]'::jsonb |
| 40 | datos_comerciales | jsonb | NO | '{}'::jsonb |
| 41 | array_direcciones_cuenta | jsonb | NO | '[]'::jsonb |
| 42 | array_contactos_cuenta | jsonb | NO | '[]'::jsonb |
| 43 | array_comentarios_cuenta | jsonb | NO | '[]'::jsonb |
| 44 | created_at | timestamp with time zone | NO | now() |
| 45 | updated_at | timestamp with time zone | NO | now() |
| 46 | comentarios_gm | text | NO | ''::text |

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
| 4 | titulo_especifico_edicion | text | NO | ''::text |
| 5 | nombre_feria | text | NO | ''::text |
| 6 | id_cuenta_feria | text | NO | ''::text |
| 7 | id_cuenta_gestion | text | NO | ''::text |
| 8 | pais | text | NO | ''::text |
| 9 | ciudad | text | NO | ''::text |
| 10 | edicion_numero | text | NO | ''::text |
| 11 | hay_intercambio | boolean | NO | false |
| 12 | id_contrato | text | NO | ''::text |
| 13 | hay_especial | boolean | NO | false |
| 14 | descripcion | text | NO | ''::text |
| 15 | text_area_comentarios | text | NO | ''::text |
| 16 | estado_vuelos | text | NO | ''::text |
| 17 | estado_hotel | text | NO | ''::text |
| 18 | estado_stand | text | NO | ''::text |
| 19 | estado_material | text | NO | ''::text |
| 20 | estado_transporte_revistas | text | NO | ''::text |
| 21 | estado_pases | text | NO | ''::text |
| 22 | textarea_gestion_evento | text | NO | ''::text |
| 23 | fecha_incio | text | NO | ''::text |
| 24 | fecha_finalizacion | text | NO | ''::text |
| 25 | en_vidrioperfil | boolean | NO | false |

Constraints:
- PRIMARY KEY ferias_db_pkey: PRIMARY KEY (id_feria)

Indexes:
- ferias_db_fecha_finalizacion_idx: CREATE INDEX ferias_db_fecha_finalizacion_idx ON public.ferias_db USING btree (fecha_finalizacion)
- ferias_db_id_contrato_idx: CREATE INDEX ferias_db_id_contrato_idx ON public.ferias_db USING btree (id_contrato)
- ferias_db_id_cuenta_feria_idx: CREATE INDEX ferias_db_id_cuenta_feria_idx ON public.ferias_db USING btree (id_cuenta_feria)

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
| 9 | total_nac_iva | numeric | YES |  |
| 10 | total_ue | numeric | YES |  |
| 11 | total_resto | numeric | YES |  |
| 12 | forma_cobro | text | YES |  |

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
| 9 | orden_compra_p3 | text | YES |  |
| 10 | numero_contabilidad | text | YES |  |
| 11 | codigo_factura | text | YES |  |
| 12 | forma_pago | text | YES |  |
| 13 | estado | text | YES |  |

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
| 14 | array_id_contenidos | jsonb | NO | '[]'::jsonb |

Constraints:
- PRIMARY KEY lineas_contratos_db_pkey: PRIMARY KEY (id_linea_contrato)

Indexes:
- lineas_contratos_db_id_contrato_idx: CREATE INDEX lineas_contratos_db_id_contrato_idx ON public.lineas_contratos_db USING btree (id_contrato)
- lineas_contratos_db_array_id_contenidos_idx: CREATE INDEX lineas_contratos_db_array_id_contenidos_idx ON public.lineas_contratos_db USING gin (array_id_contenidos)

### lineas_bancos

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_linea_banco | text | NO |  |
| 2 | banco | text | NO |  |
| 3 | fecha_operativa | text | NO | ''::text |
| 4 | fecha_valor | text | NO | ''::text |
| 5 | concepto | text | NO | ''::text |
| 6 | importe | numeric | NO | 0 |
| 7 | saldo | numeric | NO | 0 |
| 8 | estado_revision | boolean | NO | false |
| 9 | comentarios | text | NO | ''::text |
| 10 | created_at | timestamp with time zone | NO | now() |
| 11 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY lineas_bancos_pkey: PRIMARY KEY (id_linea_banco)
- CHECK lineas_bancos_banco_check: CHECK (banco IN ('Sabadell', 'Santander'))
- CHECK lineas_bancos_id_check: CHECK (id_linea_banco ~ '^(sab|san)_[0-9]{2}_[0-9]+$')

Indexes:
- lineas_bancos_banco_idx: CREATE INDEX lineas_bancos_banco_idx ON public.lineas_bancos USING btree (banco)
- lineas_bancos_fecha_operativa_idx: CREATE INDEX lineas_bancos_fecha_operativa_idx ON public.lineas_bancos USING btree (fecha_operativa)
- lineas_bancos_estado_revision_idx: CREATE INDEX lineas_bancos_estado_revision_idx ON public.lineas_bancos USING btree (estado_revision)

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
| 14 | id_servicio | text | YES |  |
| 15 | unidades | numeric | YES | 1 |
| 16 | descripcion_linea | text | YES |  |

Constraints:
- PRIMARY KEY lineas_propuestas_db_pkey: PRIMARY KEY (id_linea_propuesta)

Indexes:
- lineas_propuestas_db_id_propuesta_idx: CREATE INDEX lineas_propuestas_db_id_propuesta_idx ON public.lineas_propuestas_db USING btree (id_propuesta)

### mediateca_folders

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | mediateca_folder_id | uuid | NO |  |
| 2 | mediateca_folder_name | text | NO |  |
| 3 | mediateca_parent_folder_id | uuid | YES |  |
| 4 | mediateca_folder_created_at | timestamp with time zone | NO | now() |
| 5 | mediateca_folder_updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY mediateca_folders_pkey: PRIMARY KEY (mediateca_folder_id)
- FOREIGN KEY mediateca_folders_parent_fkey: FOREIGN KEY (mediateca_parent_folder_id) REFERENCES mediateca_folders(mediateca_folder_id) ON DELETE CASCADE

Indexes:
- mediateca_folders_parent_idx: CREATE INDEX mediateca_folders_parent_idx ON public.mediateca_folders USING btree (mediateca_parent_folder_id)
- mediateca_folders_name_idx: CREATE INDEX mediateca_folders_name_idx ON public.mediateca_folders USING btree (mediateca_folder_name)

### mediateca_contents

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | mediateca_content_id | uuid | NO |  |
| 2 | mediateca_folder_id | uuid | YES |  |
| 3 | mediateca_content_name | text | NO |  |
| 4 | mediateca_s3_key | text | NO |  |
| 5 | mediateca_content_src | text | YES |  |
| 6 | mediateca_content_mime_type | text | YES |  |
| 7 | mediateca_content_type | text | NO | 'image'::text |
| 8 | mediateca_content_created_at | timestamp with time zone | NO | now() |
| 9 | mediateca_content_updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY mediateca_contents_pkey: PRIMARY KEY (mediateca_content_id)
- UNIQUE mediateca_contents_mediateca_s3_key_key: UNIQUE (mediateca_s3_key)
- CHECK mediateca_contents_type_check: CHECK (mediateca_content_type IN ('image', 'pdf'))
- FOREIGN KEY mediateca_contents_folder_fkey: FOREIGN KEY (mediateca_folder_id) REFERENCES mediateca_folders(mediateca_folder_id) ON DELETE SET NULL

Indexes:
- mediateca_contents_folder_idx: CREATE INDEX mediateca_contents_folder_idx ON public.mediateca_contents USING btree (mediateca_folder_id)
- mediateca_contents_type_idx: CREATE INDEX mediateca_contents_type_idx ON public.mediateca_contents USING btree (mediateca_content_type)
- mediateca_contents_created_at_idx: CREATE INDEX mediateca_contents_created_at_idx ON public.mediateca_contents USING btree (mediateca_content_created_at)

### cobros_propuestas_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_cobro_propuesta | text | NO |  |
| 2 | id_propuesta | text | YES |  |
| 3 | numero_cobro | integer | YES |  |
| 4 | fecha_cobro | text | YES |  |
| 5 | importe_cobro | numeric | YES |  |
| 6 | forma_cobro | text | YES |  |
| 7 | banco_cobro | text | YES |  |
| 8 | observaciones_cobro | text | YES |  |
| 9 | created_at | timestamp with time zone | NO | now() |
| 10 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY cobros_propuestas_db_pkey: PRIMARY KEY (id_cobro_propuesta)

Indexes:
- cobros_propuestas_db_id_propuesta_idx: CREATE INDEX cobros_propuestas_db_id_propuesta_idx ON public.cobros_propuestas_db USING btree (id_propuesta)

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
| 17 | fase_propuesta | text | NO | '1'::text |
| 18 | fecha_validez_propuesta | text | YES |  |
| 19 | datos_facturacion | jsonb | NO | '{}'::jsonb |
| 20 | contacto_personalizado | jsonb | YES |  |

Constraints:
- PRIMARY KEY propuestas_db_pkey: PRIMARY KEY (id_propuesta)

Indexes:
- propuestas_db_estado_idx: CREATE INDEX propuestas_db_estado_idx ON public.propuestas_db USING btree (estado_propuesta)
- propuestas_db_fase_idx: CREATE INDEX propuestas_db_fase_idx ON public.propuestas_db USING btree (fase_propuesta)
- propuestas_db_id_cuenta_idx: CREATE INDEX propuestas_db_id_cuenta_idx ON public.propuestas_db USING btree (id_cuenta_propuesta)

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

### tareas_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_tarea | text | NO |  |
| 2 | agente | text | NO | ''::text |
| 3 | titulo | text | NO | ''::text |
| 4 | contenido | text | NO | ''::text |
| 5 | estado | text | NO | 'pendiente'::text |
| 6 | prioridad | text | NO | 'media'::text |
| 7 | created_at | timestamp with time zone | NO | now() |
| 8 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY tareas_db_pkey: PRIMARY KEY (id_tarea)

Indexes:
- tareas_db_agente_idx: CREATE INDEX tareas_db_agente_idx ON public.tareas_db USING btree (agente)
- tareas_db_estado_idx: CREATE INDEX tareas_db_estado_idx ON public.tareas_db USING btree (estado)
- tareas_db_prioridad_idx: CREATE INDEX tareas_db_prioridad_idx ON public.tareas_db USING btree (prioridad)

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
