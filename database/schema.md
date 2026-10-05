# RDS Schema Snapshot

Source: PostgreSQL `public` schema from the configured RDS connection.

## Card settlements

Migration `20260929_0001_tarjetas_liquidaciones.sql` extends `tesoreria_tarjetas` with
unique `codigo`, `descripcion`, `periodicidad_meses`, the open cycle's `inicio_periodo`,
`proximo_cierre`, `proxima_liquidacion` and anchored days `dia_cierre` / `dia_liquidacion`.
Existing cards retain their identity and tickets; their calendar must be configured.
`tesoreria_cargos_recurrentes.id_tarjeta` associates a subscription with one card.
`administracion_tickets.id_vencimiento_tarjeta` optionally replaces one projected
subscription occurrence with its receipt, with a unique constraint to avoid duplicates.
`tesoreria_tarjetas_liquidaciones` stores immutable expected/actual totals and JSON
snapshots of each reviewed cycle (or its later cancellation). `tesoreria_tarjetas_movimientos`
links bank movements uniquely to a reviewed settlement. Confirmation advances the
calendar atomically; reopening the last settlement restores its period.

## Recurring supplier charge planning

`20260921_0002_recurring_charge_other.sql` extends
`cargos_recurrentes_destinatario_check` to allow `tipo_cargo = 'otro'` only
when both `id_proveedor` and `id_agente` are null. These charges use the same
two-year planning and extension rules as supplier charges.

Migration `20260920_0002_recurring_charge_horizon.sql` adds to `tesoreria_cargos_recurrentes`:

- `termina_planificacion boolean NOT NULL DEFAULT false`: excludes an existing plan from automatic extension when true.
- `planificado_hasta date`: materialized planning horizon; new supplier plans extend two calendar years from today in Europe/Madrid.

Individual due dates are stored in the existing `tesoreria_cargos_vencimientos` table, uniquely identified by `(id_cargo_recurrente, id_regla, fecha)`. Extension retains existing due dates and applications and starts after the last stored due date of each rule. Payroll planning is unchanged.

Rules may include `importes_por_fecha`, an ISO-date-to-euro-amount JSON map used by edits in Vista Juan. It overrides a single due amount without changing the recurring base; zero cancels that date. An explicitly entered date outside the regular calendar adds one due. Supplier edits update the existing materialized due and protect payments/tickets; payroll estimates use the same exceptions when generating occurrences. Extension preserves the recurring anchor and exceptions. New income budget rows store their recurrence in the workbook row's `recurring` JSON field and do not create administrative orders. New rows are carried to prepared future workbooks with separate realized/forecast columns.

Update this file whenever tables, columns, primary keys, indexes, or constraints change. For schema changes, also add a SQL migration file under `database/migrations/`.

## Forecast banks and direct exchanges

Migration `20260922_0001_forecast_bank_direct_exchange.sql` adds:

- `tesoreria_cargos_recurrentes.banco_pago text NULL`, restricted to Sabadell or Santander. Null contributes to the unassigned bank subtotal and the global liquidity forecast.
- `comercial_contratos.condiciones_intercambio text NOT NULL DEFAULT ''`. Direct nonmonetary exchanges retain service value in `importe_intercambio`, set `es_intercambio`, and create no collection orders or receipts.

Liquidity subtracts unpaid materialized due amounts using `tesoreria_vencimientos_aplicaciones`, and legacy payments net of bank movements linked by `id_pago`. Payroll periods replace recurring payroll estimates for the same employee/month, net of paid advances. Monthly payroll without a start date is estimated at month end. Unapplied movements and incomplete planning horizons are surfaced as warnings rather than guessed allocations.

## Workflow

`20260921_0001_receipts_optional_invoice.sql` makes
`tesoreria_recibos_importados.numero_factura` nullable. An order can have a
planned receipt before an invoice exists. Its `numero_recibo` stays stable;
`numero_factura` is populated when an invoice is explicitly created or linked.

1. Apply schema changes to RDS with an explicit SQL migration.
2. Add that SQL file under `database/migrations/`.
3. Refresh this snapshot from RDS so table names, column order, keys, defaults, and constraints stay current.

## Tables

The 2026-09-17 event consolidation moved account and contact activity into
`general_eventos`. `cuentas_registro_eventos`, `contactos_registro_eventos`,
and the historical `comentarios_registro_eventos` name are compatibility views.
See `database/migrations/20260917_0001_contactos_registro_eventos_nombre.sql`
through `20260917_0004_eventos_vistas_defaults.sql`. The table sections below
predate this consolidation and are not a current inventory of the live RDS.

The 2026-07-23 proposal-to-invoice workflow extends `comercial_contratos`,
`comercial_contratos_lineas`, `produccion_contenidos`, `gestiones_produccion_db`, `tareas_db`,
`administracion_facturas_clientes`, and `tesoreria_ordenes`; it also introduces
`comercial_contratos_cobros` and `administracion_lineas_factura`. The authoritative additive
definition is `database/migrations/20260723_0001_propuesta_contrato_facturacion.sql`.

The VERI*FACTU extension adds fiscal-state and immutable-record mirror columns
to `administracion_facturas_clientes`, plus `fiscal_verifactu_registros` and `fiscal_verifactu_contadores`.
The unused, empty `fiscal_verifactu_trabajos` and `tesoreria_registros_bancarios` tables were removed by
`database/migrations/20260917_0007_drop_unused_empty_tables.sql`. Database triggers prevent mutation/deletion of emitted
invoices and fiscal records and reject fiscal-record inserts outside the
billing transaction. See `database/migrations/20260723_0002_verifactu.sql`.

The AEAT-compliance extension adds the stable installation and per-version
responsible declaration (`fiscal_verifactu_instalaciones`), the asynchronous delivery
outbox (`fiscal_verifactu_envios`), tax-detail fields, global installation chaining,
official hash metadata and XML record payloads. See
`database/migrations/20260723_0003_verifactu_aeat_compliance.sql`.

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
| 8 | rol_agente | text | NO | 'base'::text |
| 9 | estado_agente | text | YES |  |
| 10 | email_agente | text | NO | ''::text |
| 11 | accesos_personalizados | boolean | NO | false |
| 12 | array_accesos_adicionales | jsonb | NO | '[]'::jsonb |
| 13 | is_empleado_account | boolean | NO | true |

Constraints:
- agentes_db_pkey: PRIMARY KEY (id_agente)

Indexes:
- agentes_db_pkey: CREATE UNIQUE INDEX agentes_db_pkey ON public.agentes_db USING btree (id_agente)

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

### comercial_contactos

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
| 20 | saludo | text | YES |  |
| 21 | tipo_contacto | text | YES |  |
| 22 | movil | text | YES |  |
| 23 | medio_contacto | text | YES |  |
| 24 | red_social | text | YES |  |
| 25 | modificado_por_crm | text | YES |  |
| 26 | asignado_a_crm | text | YES |  |
| 27 | fuente_crm | text | YES |  |
| 28 | no_enviar_email | boolean | YES |  |
| 29 | fecha_creacion_crm | text | YES |  |
| 30 | convertido_de_lead | boolean | YES |  |
| 31 | fecha_modificacion_crm | text | YES |  |
| 32 | pais_factura | text | YES |  |
| 33 | provincia_factura | text | YES |  |
| 34 | publicaciones_que_recibe | text | YES |  |
| 35 | robinson | text | YES |  |
| 36 | origen_precontacto | text | YES |  |
| 37 | zona | text | YES |  |
| 38 | que_se_envia | text | YES |  |
| 39 | origen_base_anexa | text | YES |  |
| 40 | vidrio | text | YES |  |
| 41 | carpinteria | text | YES |  |
| 42 | proteccion_solar | text | YES |  |
| 43 | puertas_automatismos | text | YES |  |
| 44 | construccion_arquitectura | text | YES |  |
| 45 | actividad_empresa | text | YES |  |

Constraints:
- PRIMARY KEY contactos_db_pkey: PRIMARY KEY (id_contacto)

Indexes:
- contactos_db_id_cuenta_idx: CREATE INDEX contactos_db_id_cuenta_idx ON public.comercial_contactos USING btree (id_cuenta)

### produccion_planillos_previos

Planillo previo editable por revista, migración `20261005_0001_preliminary_flatplans.sql`. `id_revista text` es clave primaria y referencia `servicios_revistas`. `plan jsonb` contiene posiciones físicas, bloques indivisibles, sus datos de origen y contenidos retirados. `version integer` protege frente a ediciones simultáneas; `updated_at timestamptz` registra el guardado. La posición 0 es portada, la 1 interior portada y la 2 corresponde a página impresa 1; la numeración visible es Portada, Interior portada, 1, 2, 3... No existe contraportada y solo la portada permanece fija al inicio, el total es par y los bloques son consecutivos. No altera el planillo definitivo ni los registros originales de producción o redacción.

### produccion_contenidos

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
- contenidos_db_id_publicacion_idx: CREATE INDEX contenidos_db_id_publicacion_idx ON public.produccion_contenidos USING btree (id_publicacion)
- contenidos_db_hoja_prod_idx: CREATE INDEX contenidos_db_hoja_prod_idx ON public.produccion_contenidos USING btree (hoja_prod)

### comercial_contratos

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
| 19 | id_archivo_firmado | uuid | YES |  |

Constraints:
- PRIMARY KEY contratos_db_pkey: PRIMARY KEY (id_contrato)

Indexes:
- contratos_db_array_id_ordenes_idx: CREATE INDEX contratos_db_array_id_ordenes_idx ON public.comercial_contratos USING gin (array_id_ordenes)

### comercial_cuentas

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
- cuentas_db_created_at_idx: CREATE INDEX cuentas_db_created_at_idx ON public.comercial_cuentas USING btree (created_at)
- cuentas_db_id_agente_idx: CREATE INDEX cuentas_db_id_agente_idx ON public.comercial_cuentas USING btree (id_agente)
- cuentas_db_nombre_empresa_idx: CREATE INDEX cuentas_db_nombre_empresa_idx ON public.comercial_cuentas USING btree (nombre_empresa)

### administracion_ferias_ediciones

Desde `20260918_0009_ferias_catalogo_ediciones.sql`, esta tabla conserva las 108 ediciones y las vincula mediante `id_feria_base` a `administracion_ferias_db`. Los diez apartados de gestión son columnas de texto de la edición. `20260918_0010_ferias_ediciones_existing_form_fields.sql` completa los campos del formulario existente.

Las columnas históricas `nombre_feria`, `pais`, `periodicidad` y `tematica` se mantienen como datos de origen para no perder variantes conflictivas de cuatro ferias. Las nuevas ediciones no las escriben; la aplicación lee esos atributos del catálogo vinculado.

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
- ferias_db_fecha_finalizacion_idx: CREATE INDEX ferias_db_fecha_finalizacion_idx ON public.administracion_ferias_ediciones USING btree (fecha_finalizacion)
- ferias_db_id_contrato_idx: CREATE INDEX ferias_db_id_contrato_idx ON public.administracion_ferias_ediciones USING btree (id_contrato)
- ferias_db_id_cuenta_feria_idx: CREATE INDEX ferias_db_id_cuenta_feria_idx ON public.administracion_ferias_ediciones USING btree (id_cuenta_feria)

### administracion_ferias_db

Catálogo de ferias (102 registros migrados): `id_feria`, `nombre_feria`, `pais`, `periodicidad`, `tematica`, `descripcion`, `created_at` y `updated_at`. El nombre normalizado es único.

### administracion_facturas_clientes

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
- facturas_clientes_db_id_cuenta_idx: CREATE INDEX facturas_clientes_db_id_cuenta_idx ON public.administracion_facturas_clientes USING btree (id_cuenta)

### administracion_facturas_proveedores

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
- facturas_proveedores_db_id_proveedor_idx: CREATE INDEX facturas_proveedores_db_id_proveedor_idx ON public.administracion_facturas_proveedores USING btree (id_proveedor)

### comercial_contratos_lineas

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
- lineas_contratos_db_id_contrato_idx: CREATE INDEX lineas_contratos_db_id_contrato_idx ON public.comercial_contratos_lineas USING btree (id_contrato)
- lineas_contratos_db_array_id_contenidos_idx: CREATE INDEX lineas_contratos_db_array_id_contenidos_idx ON public.comercial_contratos_lineas USING gin (array_id_contenidos)

### tesoreria_movimientos_bancarios

Memoria de revisión: la migración `20260920_0001_bank_review_memory.sql` añade las siguientes tablas sin cambiar las columnas del movimiento:

| Tabla | Clave y campos principales | Relación |
|---|---|---|
| tesoreria_cargos_vencimientos | id text PK; id_cargo_recurrente bigint; id_regla text; fecha date; importe numeric(16,2); descripcion text; programacion jsonb; created_at timestamptz | Única por cargo, regla y fecha; conserva la previsión histórica aplicada. |
| tesoreria_vencimientos_aplicaciones | PK (id_linea_banco, id_vencimiento); importe numeric(16,2); actor text; created_at timestamptz | FK a movimiento con ON DELETE CASCADE y FK a vencimiento. |
| tesoreria_revision_decisiones | id text PK; clave, huella, tipo text; movimientos text[]; motivo text; evidencia jsonb; actor text; created_at, revoked_at timestamptz | Evidencia y motivo de cada decisión, incluidos descartes anteriores. |
| tesoreria_revision_criterios | id text PK; id_decision text FK; condiciones jsonb; actor text; created_at, revoked_at timestamptz | Criterios reutilizables explícitos y revocables. |

La programación JSON de cargos recurrentes conserva `id_regla` y admite `inicio_dia`, `inicio_mes`, `inicio_anio` para identificar el primer vencimiento periódico. Sin esos datos no se inventa un anclaje temporal. Véase `docs/revision-bancaria-memoria.md`.

Las nuevas reglas de previsión guardan `contains_iva`, `tipo_iva`, `base_imponible` e `importe_iva`. Sin IVA, la base es el total; con IVA se exige porcentaje y se deduce del total. `bases_por_fecha` conserva la base recalculada de excepciones en `importes_por_fecha`. No se infiere un porcentaje para reglas antiguas sin respuesta explícita. Las nóminas conservan importe neto y no usan esta base fiscal.

La página principal de liquidez y Vista Juan consultan el mismo libro anual. `syncJuanOperationalRows` incorpora una fila de presentación por cargo activo y banco, sin crear otro cargo, y amplía las recurrencias vigentes al horizonte operativo. Las órdenes pendientes se desglosan dentro del presupuesto de banco, mes y forma de cobro: el total toma el mayor entre presupuesto y órdenes más aplicaciones válidas, sin sumarlos dos veces. Se conserva el presupuesto original para informar diferencias; las órdenes sin banco requieren asignación.

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
| 12 | id_proveedor | text | YES |  |
| 13 | id_cuenta | text | YES |  |
| 14 | id_orden | text | YES |  |
| 15 | id_pago | text | YES |  |
| 16 | id_cargo_recurrente | bigint | YES |  |
| 17 | id_agente | text | YES |  |
| 18 | duplicado_descartado | boolean | NO | false |

Constraints:
- PRIMARY KEY lineas_bancos_pkey: PRIMARY KEY (id_linea_banco)
- CHECK lineas_bancos_banco_check: CHECK (banco IN ('Sabadell', 'Santander'))
- CHECK lineas_bancos_id_check: CHECK (id_linea_banco ~ '^(sab|san)_[0-9]{2}_[0-9]+$')

Indexes:
- lineas_bancos_banco_idx: CREATE INDEX lineas_bancos_banco_idx ON public.tesoreria_movimientos_bancarios USING btree (banco)
- lineas_bancos_fecha_operativa_idx: CREATE INDEX lineas_bancos_fecha_operativa_idx ON public.tesoreria_movimientos_bancarios USING btree (fecha_operativa)
- lineas_bancos_estado_revision_idx: CREATE INDEX lineas_bancos_estado_revision_idx ON public.tesoreria_movimientos_bancarios USING btree (estado_revision)
- lineas_bancos_id_agente_idx: CREATE INDEX lineas_bancos_id_agente_idx ON public.tesoreria_movimientos_bancarios USING btree (id_agente)

### comercial_propuestas_lineas

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
- lineas_propuestas_db_id_propuesta_idx: CREATE INDEX lineas_propuestas_db_id_propuesta_idx ON public.comercial_propuestas_lineas USING btree (id_propuesta)

### mediateca_carpetas

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | mediateca_folder_id | uuid | NO |  |
| 2 | mediateca_folder_name | text | NO |  |
| 3 | mediateca_parent_folder_id | uuid | YES |  |
| 4 | mediateca_folder_created_at | timestamp with time zone | NO | now() |
| 5 | mediateca_folder_updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY mediateca_folders_pkey: PRIMARY KEY (mediateca_folder_id)
- FOREIGN KEY mediateca_folders_parent_fkey: FOREIGN KEY (mediateca_parent_folder_id) REFERENCES mediateca_carpetas(mediateca_folder_id) ON DELETE CASCADE

Indexes:
- mediateca_folders_parent_idx: CREATE INDEX mediateca_folders_parent_idx ON public.mediateca_carpetas USING btree (mediateca_parent_folder_id)
- mediateca_folders_name_idx: CREATE INDEX mediateca_folders_name_idx ON public.mediateca_carpetas USING btree (mediateca_folder_name)

### mediateca_archivos

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
- FOREIGN KEY mediateca_contents_folder_fkey: FOREIGN KEY (mediateca_folder_id) REFERENCES mediateca_carpetas(mediateca_folder_id) ON DELETE SET NULL

Indexes:
- mediateca_contents_folder_idx: CREATE INDEX mediateca_contents_folder_idx ON public.mediateca_archivos USING btree (mediateca_folder_id)
- mediateca_contents_type_idx: CREATE INDEX mediateca_contents_type_idx ON public.mediateca_archivos USING btree (mediateca_content_type)
- mediateca_contents_created_at_idx: CREATE INDEX mediateca_contents_created_at_idx ON public.mediateca_archivos USING btree (mediateca_content_created_at)

### comercial_propuestas_cobros

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
- cobros_propuestas_db_id_propuesta_idx: CREATE INDEX cobros_propuestas_db_id_propuesta_idx ON public.comercial_propuestas_cobros USING btree (id_propuesta)

### tesoreria_ordenes

`receipt_default_bank` asigna Sabadell al insertar o editar una orden de recibo/remesa cuyo banco esté vacío. No sustituye una selección explícita: el usuario puede cambiar después el banco. Las transferencias no reciben este valor inicial. Véase `20261003_0004_receipt_default_bank.sql`.

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
- ordenes_db_id_contrato_idx: CREATE INDEX ordenes_db_id_contrato_idx ON public.tesoreria_ordenes USING btree (id_contrato)
- ordenes_db_fecha_teorica_cobro_idx: CREATE INDEX ordenes_db_fecha_teorica_cobro_idx ON public.tesoreria_ordenes USING btree (fecha_teorica_cobro)
- ordenes_db_forma_cobro_idx: CREATE INDEX ordenes_db_forma_cobro_idx ON public.tesoreria_ordenes USING btree (forma_cobro)

### tesoreria_pagos_previstos

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
- pagos_db_id_proveedor_idx: CREATE INDEX pagos_db_id_proveedor_idx ON public.tesoreria_pagos_previstos USING btree (id_proveedor)

### comercial_propuestas_plantillas

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_plantilla | uuid | NO | gen_random_uuid() |
| 2 | nombre | text | NO |  |
| 3 | versiones | jsonb | NO | '{}'::jsonb |
| 4 | created_at | timestamp with time zone | NO | now() |
| 5 | updated_at | timestamp with time zone | NO | now() |

Cada versión contiene las líneas de productos de un idioma; `es` es obligatoria.

### comercial_propuestas_db

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
- propuestas_db_estado_idx: CREATE INDEX propuestas_db_estado_idx ON public.comercial_propuestas_db USING btree (estado_propuesta)
- propuestas_db_fase_idx: CREATE INDEX propuestas_db_fase_idx ON public.comercial_propuestas_db USING btree (fase_propuesta)
- propuestas_db_id_cuenta_idx: CREATE INDEX propuestas_db_id_cuenta_idx ON public.comercial_propuestas_db USING btree (id_cuenta_propuesta)

### administracion_proveedores

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

### servicios_publicaciones

La migración `20260918_0008_revista_reminder.sql` añade `fecha_recordatorio` (texto, no nulo, por defecto vacío). La interfaz de Revistas guarda esta fecha junto con `fecha_publicacion` y `deadline_materiales`.

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

### tesoreria_remesas

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_remesa | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY remesas_db_pkey: PRIMARY KEY (id_remesa)

### servicios_revistas

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_revista | text | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |
| 3 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY revistas_db_pkey: PRIMARY KEY (id_revista)

### servicios_grupos_servicios

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_medio | text | NO |  |
| 2 | nombre_medio | text | NO | ''::text |
| 3 | created_at | timestamp with time zone | NO | now() |
| 4 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- PRIMARY KEY grupos_servicios_pkey: PRIMARY KEY (id_medio)

### agentes_roles

La migración `20261003_0003_direction_role.sql` registra `direccion` como rol propio. `app/config/roleAccess.ts` permite el área Dirección y sus API, sin convertirlo en superadmin ni permitir administración de usuarios/roles.

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

### agentes_seguimientos

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

### gestiones_produccion_db

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_gestion_prod | text | NO |  |
| 2 | nombre_gestion | text | NO | ''::text |
| 3 | articulos_array | jsonb | NO | '[]'::jsonb |
| 4 | materiales_array | jsonb | NO | '[]'::jsonb |
| 5 | created_at | timestamp with time zone | NO | now() |
| 6 | updated_at | timestamp with time zone | NO | now() |
| 7 | id_publicacion_espana | text | YES |  |
| 8 | id_publicacion_latam | text | YES |  |
| 9 | id_publicacion_hueco | text | YES |  |
| 10 | asociada_a_gestiones | jsonb | NO | '[]'::jsonb |
| 11 | rev_prioridad | text | NO | ''::text |
| 12 | rev_carpeta_produccion | text | NO | ''::text |
| 13 | id_cuenta | text | YES |  |
| 14 | rev_titulo_articulo | text | NO | ''::text |
| 15 | rev_estado_proceso_produccion | text | NO | ''::text |
| 16 | rev_responsable_correccion | text | NO | ''::text |
| 17 | rev_numero_paginas_actuales | integer | YES |  |
| 18 | comentarios | text | NO | ''::text |
| 19 | tipo_contenido | text | NO | 'articulo'::text |

Constraints:
- PRIMARY KEY gestiones_produccion_db_pkey: PRIMARY KEY (id_gestion_prod)

Indexes:
- gestiones_produccion_db_id_cuenta_idx: CREATE INDEX gestiones_produccion_db_id_cuenta_idx ON public.gestiones_produccion_db USING btree (id_cuenta)

### gestiones_prod_listas

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_lista_gestiones_prod | text | NO |  |
| 2 | nombre_lista | text | NO | ''::text |
| 3 | array_objetos_gestiones | jsonb | NO | '[]'::jsonb |
| 4 | posicion_lista | integer | NO |  |
| 5 | created_at | timestamp with time zone | NO | now() |
| 6 | updated_at | timestamp with time zone | NO | now() |
| 7 | es_lista_sistema | boolean | NO | false |
| 8 | oculta_tablero | boolean | NO | false |
| 9 | pestana_lista | text | NO | 'revista'::text |

Constraints:
- PRIMARY KEY gestiones_prod_listas_pkey: PRIMARY KEY (id_lista_gestiones_prod)
- CHECK gestiones_prod_listas_posicion_lista_check: CHECK (posicion_lista >= 0)

Indexes:
- gestiones_prod_listas_pestana_posicion_idx: CREATE UNIQUE INDEX gestiones_prod_listas_pestana_posicion_idx ON public.gestiones_prod_listas USING btree (pestana_lista, posicion_lista)

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
- FOREIGN KEY servicios_db_id_medio_fkey: FOREIGN KEY (id_medio) REFERENCES servicios_grupos_servicios(id_medio)

Indexes:
- servicios_db_id_medio_idx: CREATE INDEX servicios_db_id_medio_idx ON public.servicios_db USING btree (id_medio)

### general_copias_seguridad

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_copia_seguridad | bigint | NO | nextval('registro_copias_seguridad_id_copia_seguridad_seq'::regclass) |
| 2 | nombre | character varying(255) | NO |  |
| 3 | fecha | timestamp with time zone | NO | now() |
| 4 | detalles | text | NO | ''::text |
| 5 | estado | character varying(20) | NO | 'correcta'::character varying |
| 6 | tablas | jsonb | NO | '[]'::jsonb |

Constraints:
- PRIMARY KEY registro_copias_seguridad_pkey: PRIMARY KEY (id_copia_seguridad)
- CHECK registro_copias_seguridad_estado_check: CHECK (estado::text = ANY (ARRAY['correcta'::character varying, 'error'::character varying]::text[]))

Indexes:
- idx_registro_copias_seguridad_fecha: CREATE INDEX idx_registro_copias_seguridad_fecha ON public.general_copias_seguridad USING btree (fecha DESC)

### laboral_anticipos

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id | text | NO |  |
| 2 | id_empleado | text | NO |  |
| 3 | mes | smallint | NO |  |
| 4 | anio | smallint | NO |  |
| 5 | importe_neto | numeric(12,2) | NO |  |
| 6 | estado | text | NO | 'pendiente'::text |
| 7 | comentarios | text | NO | ''::text |
| 8 | id_transferencia | text | YES |  |
| 9 | created_at | timestamp with time zone | NO | now() |
| 10 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- anticipos_empleados_anio_check: CHECK (((anio >= 2000) AND (anio <= 2100)))
- anticipos_empleados_estado_check: CHECK ((estado = ANY (ARRAY['pagado'::text, 'pendiente'::text])))
- anticipos_empleados_id_empleado_fkey: FOREIGN KEY (id_empleado) REFERENCES agentes_db(id_agente)
- anticipos_empleados_id_transferencia_fkey: FOREIGN KEY (id_transferencia) REFERENCES tesoreria_movimientos_bancarios(id_linea_banco)
- anticipos_empleados_id_transferencia_key: UNIQUE (id_transferencia)
- anticipos_empleados_importe_neto_check: CHECK ((importe_neto > (0)::numeric))
- anticipos_empleados_mes_check: CHECK (((mes >= 1) AND (mes <= 12)))
- anticipos_empleados_pkey: PRIMARY KEY (id)

Indexes:
- anticipos_empleados_id_transferencia_key: CREATE UNIQUE INDEX anticipos_empleados_id_transferencia_key ON public.laboral_anticipos USING btree (id_transferencia)
- anticipos_empleados_periodo_idx: CREATE INDEX anticipos_empleados_periodo_idx ON public.laboral_anticipos USING btree (id_empleado, anio, mes)
- anticipos_empleados_pkey: CREATE UNIQUE INDEX anticipos_empleados_pkey ON public.laboral_anticipos USING btree (id)

### laboral_nominas

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id | text | NO |  |
| 2 | id_empleado | text | NO |  |
| 3 | mes | smallint | NO |  |
| 4 | anio | smallint | NO |  |
| 5 | estado | text | NO | 'pendiente'::text |
| 6 | importe_neto | numeric(12,2) | NO | 0 |
| 7 | anticipos | text[] | NO | '{}'::text[] |
| 8 | id_transferencia | text | YES |  |
| 9 | comentarios | text | NO | ''::text |
| 10 | created_at | timestamp with time zone | NO | now() |
| 11 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- nominas_anio_check: CHECK (((anio >= 2000) AND (anio <= 2100)))
- nominas_estado_check: CHECK ((estado = ANY (ARRAY['pagado'::text, 'pendiente'::text])))
- nominas_id_empleado_anio_mes_key: UNIQUE (id_empleado, anio, mes)
- nominas_id_empleado_fkey: FOREIGN KEY (id_empleado) REFERENCES agentes_db(id_agente)
- nominas_id_transferencia_fkey: FOREIGN KEY (id_transferencia) REFERENCES tesoreria_movimientos_bancarios(id_linea_banco)
- nominas_id_transferencia_key: UNIQUE (id_transferencia)
- nominas_importe_neto_check: CHECK ((importe_neto >= (0)::numeric))
- nominas_mes_check: CHECK (((mes >= 1) AND (mes <= 12)))
- nominas_pkey: PRIMARY KEY (id)

Indexes:
- nominas_anticipos_idx: CREATE INDEX nominas_anticipos_idx ON public.laboral_nominas USING gin (anticipos)
- nominas_id_empleado_anio_mes_key: CREATE UNIQUE INDEX nominas_id_empleado_anio_mes_key ON public.laboral_nominas USING btree (id_empleado, anio, mes)
- nominas_id_transferencia_key: CREATE UNIQUE INDEX nominas_id_transferencia_key ON public.laboral_nominas USING btree (id_transferencia)
- nominas_pkey: CREATE UNIQUE INDEX nominas_pkey ON public.laboral_nominas USING btree (id)

### laboral_calendarios

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | anio | smallint | NO |  |
| 2 | created_at | timestamp with time zone | NO | now() |

Constraints:
- calendarios_laborales_anio_check: CHECK (((anio >= 2000) AND (anio <= 2100)))
- calendarios_laborales_pkey: PRIMARY KEY (anio)

Indexes:
- calendarios_laborales_pkey: CREATE UNIQUE INDEX calendarios_laborales_pkey ON public.laboral_calendarios USING btree (anio)

### laboral_eventos_calendario

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id | text | NO |  |
| 2 | anio | smallint | NO |  |
| 3 | tipo | text | NO |  |
| 4 | titulo | text | NO |  |
| 5 | inicio | date | NO |  |
| 6 | fin | date | NO |  |
| 7 | comentarios | text | NO | ''::text |
| 8 | created_at | timestamp with time zone | NO | now() |

Constraints:
- eventos_calendario_laboral_anio_fkey: FOREIGN KEY (anio) REFERENCES laboral_calendarios(anio)
- eventos_calendario_laboral_check: CHECK (((fin >= inicio) AND (EXTRACT(year FROM inicio) = (anio)::numeric) AND (EXTRACT(year FROM fin) = (anio)::numeric)))
- eventos_calendario_laboral_pkey: PRIMARY KEY (id)
- eventos_calendario_laboral_tipo_check: CHECK ((tipo = ANY (ARRAY['vacaciones'::text, 'festivo_nacional'::text, 'festivo_autonomico'::text, 'festivo_barcelona'::text, 'festivo_convenio'::text, 'deadline_revista'::text, 'publicacion_revista'::text, 'feria'::text])))
- eventos_calendario_laboral_titulo_check: CHECK ((length(btrim(titulo)) > 0))

Indexes:
- eventos_calendario_laboral_anio_idx: CREATE INDEX eventos_calendario_laboral_anio_idx ON public.laboral_eventos_calendario USING btree (anio, inicio)
- eventos_calendario_laboral_pkey: CREATE UNIQUE INDEX eventos_calendario_laboral_pkey ON public.laboral_eventos_calendario USING btree (id)

### laboral_dias_libre_disposicion

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id_empleado | text | NO |  |
| 2 | anio | smallint | NO |  |
| 3 | numero | smallint | NO |  |
| 4 | fecha | date | NO |  |

Constraints:
- empleados_libre_disposicion_anio_check: CHECK (((anio >= 2000) AND (anio <= 2100)))
- empleados_libre_disposicion_check: CHECK ((EXTRACT(year FROM fecha) = (anio)::numeric))
- empleados_libre_disposicion_id_empleado_fecha_key: UNIQUE (id_empleado, fecha)
- empleados_libre_disposicion_id_empleado_fkey: FOREIGN KEY (id_empleado) REFERENCES agentes_db(id_agente)
- empleados_libre_disposicion_numero_check: CHECK (((numero >= 1) AND (numero <= 3)))
- empleados_libre_disposicion_pkey: PRIMARY KEY (id_empleado, anio, numero)

Indexes:
- empleados_libre_disposicion_id_empleado_fecha_key: CREATE UNIQUE INDEX empleados_libre_disposicion_id_empleado_fecha_key ON public.laboral_dias_libre_disposicion USING btree (id_empleado, fecha)
- empleados_libre_disposicion_pkey: CREATE UNIQUE INDEX empleados_libre_disposicion_pkey ON public.laboral_dias_libre_disposicion USING btree (id_empleado, anio, numero)

### laboral_ausencias

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id | text | NO |  |
| 2 | id_empleado | text | NO |  |
| 3 | tipo | text | NO |  |
| 4 | inicio | date | NO |  |
| 5 | fin | date | NO |  |
| 6 | comentarios | text | NO | ''::text |
| 7 | created_at | timestamp with time zone | NO | now() |

Constraints:
- ausencias_empleados_check: CHECK ((fin >= inicio))
- ausencias_empleados_id_empleado_fkey: FOREIGN KEY (id_empleado) REFERENCES agentes_db(id_agente)
- ausencias_empleados_pkey: PRIMARY KEY (id)

Indexes:
- ausencias_empleados_empleado_idx: CREATE INDEX ausencias_empleados_empleado_idx ON public.laboral_ausencias USING btree (id_empleado, inicio)
- ausencias_empleados_pkey: CREATE UNIQUE INDEX ausencias_empleados_pkey ON public.laboral_ausencias USING btree (id)

### laboral_comentarios_empleados

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id | text | NO |  |
| 2 | id_empleado | text | NO |  |
| 3 | comentario | text | NO |  |
| 4 | created_at | timestamp with time zone | NO | now() |

Constraints:
- comentarios_empleados_comentario_check: CHECK ((length(btrim(comentario)) > 0))
- comentarios_empleados_id_empleado_fkey: FOREIGN KEY (id_empleado) REFERENCES agentes_db(id_agente)
- comentarios_empleados_pkey: PRIMARY KEY (id)

Indexes:
- comentarios_empleados_empleado_idx: CREATE INDEX comentarios_empleados_empleado_idx ON public.laboral_comentarios_empleados USING btree (id_empleado, created_at)
- comentarios_empleados_pkey: CREATE UNIQUE INDEX comentarios_empleados_pkey ON public.laboral_comentarios_empleados USING btree (id)

### laboral_procesos_seleccion

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id | text | NO |  |
| 2 | nombre | text | NO |  |
| 3 | oferta_condiciones | text | NO | ''::text |
| 4 | mensaje_pre_llamada | text | NO | ''::text |
| 5 | mensaje_post_llamada | text | NO | ''::text |
| 6 | mensaje_rechazo | text | NO | ''::text |
| 7 | created_at | timestamp with time zone | NO | now() |
| 8 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- procesos_contratacion_nombre_check: CHECK ((length(btrim(nombre)) > 0))
- procesos_contratacion_pkey: PRIMARY KEY (id)

Indexes:
- procesos_contratacion_pkey: CREATE UNIQUE INDEX procesos_contratacion_pkey ON public.laboral_procesos_seleccion USING btree (id)

### laboral_candidatos

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id | text | NO |  |
| 2 | id_proceso | text | NO |  |
| 3 | nombre | text | NO |  |
| 4 | resumen_cv | text | NO | ''::text |
| 5 | comentarios | text | NO | ''::text |
| 6 | estado | text | NO | 'pendiente llamada'::text |
| 7 | created_at | timestamp with time zone | NO | now() |
| 8 | updated_at | timestamp with time zone | NO | now() |

Constraints:
- candidatos_contratacion_estado_check: CHECK ((estado = ANY (ARRAY['pendiente llamada'::text, 'rechazado en llamada'::text, 'pendiente reunión presencial'::text, 'rechazado en reunión presencial'::text, 'elegido'::text, 'reserva'::text])))
- candidatos_contratacion_id_proceso_fkey: FOREIGN KEY (id_proceso) REFERENCES laboral_procesos_seleccion(id)
- candidatos_contratacion_nombre_check: CHECK ((length(btrim(nombre)) > 0))
- candidatos_contratacion_pkey: PRIMARY KEY (id)

Indexes:
- candidatos_contratacion_pkey: CREATE UNIQUE INDEX candidatos_contratacion_pkey ON public.laboral_candidatos USING btree (id)
- candidatos_contratacion_proceso_idx: CREATE INDEX candidatos_contratacion_proceso_idx ON public.laboral_candidatos USING btree (id_proceso)

### laboral_documentos

| # | Column | Type | Nullable | Default |
|---:|---|---|---|---|
| 1 | id | text | NO |  |
| 2 | id_empleado | text | YES |  |
| 3 | id_nomina | text | YES |  |
| 4 | id_anticipo | text | YES |  |
| 5 | nombre | text | NO |  |
| 6 | content_type | text | NO |  |
| 7 | tamano | integer | NO |  |
| 8 | s3_key | text | YES |  |
| 9 | created_at | timestamp with time zone | NO | now() |
| 10 | contenido | bytea | YES |  |

Constraints:
- documentos_laborales_almacenamiento_check: CHECK (((num_nonnulls(s3_key, contenido) = 1) AND ((contenido IS NULL) OR (octet_length(contenido) = tamano))))
- documentos_laborales_check: CHECK ((num_nonnulls(id_empleado, id_nomina, id_anticipo) = 1))
- documentos_laborales_id_anticipo_fkey: FOREIGN KEY (id_anticipo) REFERENCES laboral_anticipos(id)
- documentos_laborales_id_empleado_fkey: FOREIGN KEY (id_empleado) REFERENCES agentes_db(id_agente)
- documentos_laborales_id_nomina_fkey: FOREIGN KEY (id_nomina) REFERENCES laboral_nominas(id)
- documentos_laborales_pkey: PRIMARY KEY (id)
- documentos_laborales_s3_key_key: UNIQUE (s3_key)
- documentos_laborales_tamano_check: CHECK (((tamano > 0) AND (tamano <= 15728640)))

Indexes:
- documentos_laborales_anticipo_idx: CREATE INDEX documentos_laborales_anticipo_idx ON public.laboral_documentos USING btree (id_anticipo)
- documentos_laborales_empleado_idx: CREATE INDEX documentos_laborales_empleado_idx ON public.laboral_documentos USING btree (id_empleado)
- documentos_laborales_nomina_idx: CREATE INDEX documentos_laborales_nomina_idx ON public.laboral_documentos USING btree (id_nomina)
- documentos_laborales_pkey: CREATE UNIQUE INDEX documentos_laborales_pkey ON public.laboral_documentos USING btree (id)
- documentos_laborales_s3_key_key: CREATE UNIQUE INDEX documentos_laborales_s3_key_key ON public.laboral_documentos USING btree (s3_key)

### tesoreria_prevision_juan

Previsión mensual independiente del Excel del contable. Migración `20261003_0001_juan_liquidity.sql`.

| Column | Type | Description |
|---|---|---|
| id | text PRIMARY KEY | Identificador anual de la presentaci?n (`juan-2026`, `juan-2027`, etc.). |
| source_name | text NOT NULL | Nombre del archivo de origen. |
| sheets | jsonb NOT NULL | Hojas editables: ingresos, pagos, días habituales, columnas mensuales y comprobaciones. El original 2026 conserva 15 columnas; los siguientes años usan 24 (realizado/previsto por mes). Importes en céntimos enteros; null conserva ausencia de dato. `closedMonths`, `closingBudget`, `priorActual` y `priorForecast` conservan cierres reversibles; `cardPart` distingue suscripciones y variable, y `budgetIsEnvelope` mantiene el presupuesto inicial sin duplicar suscripciones. |
| original_sheets | jsonb NOT NULL | Copia original de las hojas, conservada al editar y reimportar. |
| version | integer NOT NULL DEFAULT 1 | Control de concurrencia de ediciones y aplicaciones. |
| updated_at | timestamptz NOT NULL DEFAULT now() | Última modificación. |

### tesoreria_prevision_juan_enlaces

Asociaciones explícitas de celdas previstas con cargos recurrentes. No se deducen asociaciones solo por importe ni se suman presupuestos a las órdenes existentes. PK `(workbook_id, cell_key)`; `workbook_id` referencia `tesoreria_prevision_juan(id)`. Columnas: `section` (income/payments), `target_id` nullable (id del cargo recurrente), `status` (matched/integrated cuando el vínculo está confirmado) y `note`. Los conflictos se conservan en las asociaciones de filas antes de generar vínculos efectivos.

### tesoreria_prevision_juan_aplicaciones

Aplicaciones hist?ricas parciales de movimientos revisados a presupuestos del ERP. La conciliaci?n ordinaria genera ahora las aplicaciones autom?ticamente al consultar la previsi?n. PK `(workbook_id, cell_key, id_linea_banco)`; FK a `tesoreria_prevision_juan(id)` y `tesoreria_movimientos_bancarios(id_linea_banco)`. `importe numeric(14,2)` positivo en euros y `created_at timestamptz`. Los movimientos reabiertos o descartados no reducen lo pendiente. La aplicación no modifica órdenes, nóminas ni asociaciones contables existentes.

### tesoreria_prevision_juan_asociaciones

Cruce y preparación por concepto del Excel. Migración `20261003_0002_juan_matching.sql`. PK `(workbook_id, bank, row_id)`; FK a `tesoreria_prevision_juan(id)`. `provider_id` y `employee_id` son opcionales y referencian proveedores y agentes existentes; `charge_ids jsonb` identifica los cargos candidatos o asociados. `status` distingue asociación coincidente, cargo integrado, conflicto, ambigüedad, pendiente de proveedor/empleado y grupo. `evidence jsonb` conserva candidatos, explicación y discrepancias por mes sin alterar el importe original ni elegir unilateralmente el valor correcto. `updated_at timestamptz` registra la preparación.

`projected` identifica bases estimadas del año siguiente sin crear vencimientos nuevos en el ERP. Desde el 1 de octubre, `ensureJuanYears` prepara el siguiente año al consultar la vista y conserva los anteriores por su id anual. Solo las asociaciones con programación vigente generan vínculos efectivos. El saldo inicial nuevo queda pendiente del cierre anterior; no se copia un saldo previsto como real.

### tesoreria_presupuestos_liquidez

Fuente compartida de los presupuestos mensuales del ERP, migraci?n `20261004_0001_unified_liquidity_budgets.sql`. Clave primaria `(anio, banco, seccion, concepto_id, mes)`. `importe numeric(14,2)` nullable contiene euros; `concepto text` conserva la etiqueta y `updated_at timestamptz` registra la edici?n. Ambas vistas consultan esta tabla; los cargos y ?rdenes vinculados sustituyen el presupuesto correspondiente sin volver a sumarlo. Las hojas JSON conservan la presentaci?n y los cierres hist?ricos, no una previsi?n financiera independiente.

### Obligaciones y recuperación de documentos

`20261005_0002_invoice_payment_obligations.sql` añade `tesoreria_pagos_previstos.id_vencimiento text`, con índice único parcial para la sustitución explícita de un vencimiento estimado. Los pagos documentados se proyectan al consultar; no se duplican mediante sincronización en GET. Los pagos sin banco se muestran en una bandeja. No se elimina un cargo cuyo vencimiento esté vinculado a una factura.

`20261005_0003_mediateca_trash.sql` crea `mediateca_papelera`: `id uuid`, `deleted_at`, `folders jsonb`, `media jsonb` y `restored_at`. La eliminación conserva los objetos S3; la restauración de los registros es transaccional y no sobrescribe identidades existentes.

`20261005_0005_invoice_uploads.sql` crea `administracion_facturas_subidas`: `id uuid`, `s3_key`, `url`, `actor`, `state`, `created_at` e `invoice_id`. Los estados son `pending`, `consumed`, `deleting` y `removed`; la factura consume la subida provisional del mismo actor.

### Importaciones, suscripciones y publicación de planillos

`20261005_0004_workflow_revisions.sql` crea `operaciones_importaciones_aplicadas` con `fingerprint` como PK, `payload_hash`, `result jsonb` y `created_at`. Permite repetir un lote sin duplicar registros. Añade `revista`, `edicion` y `renovacion_propuesta_id` a `comercial_suscripciones`.

La misma migración crea `produccion_planillos_publicaciones`, PK `(id_revista,version)`, `plan jsonb` y `published_at`, para archivar versiones publicadas. `20261005_0006_final_flatplan_assignments.sql` crea `contenidos_revistas_db`: PK `contenido_revista_id`, FK `revista_id` a `servicios_revistas`, FK `contenido_id` a `produccion_contenidos`, `numero_pagina`, `tipo_pagina`, `pagina_del_contenido` y marcas temporales. La posición es única por revista; `-1` representa portada, `0` interior portada y los positivos son páginas de revista. La publicación valida la versión y sustituye todas las asignaciones en una transacción.
