# Memoria de revisión bancaria

La comparación vive en `server/features/banco/BankReviewAnalysis.js`; su persistencia, en `BankReviewMemoryRepository.js`. La API `POST /api/v1/direccion/bancos/revision/memoria` analiza sin escribir y acepta las asignaciones provisionales del asistente. `PUT` permite revocar decisiones/criterios o resolver una comparación con control de cambios. El guardado normal prepara aplicaciones y decisiones y las confirma dentro de la transacción de `saveBankWorkflow`.

## Modelo

- `tesoreria_cargos_vencimientos`: identidad por cargo, regla y fecha. Las reglas nuevas tienen UUID; las existentes reciben una identidad determinista al leerlas que se conserva al editarlas. Los vencimientos se calculan durante la consulta y se materializan al asociarlos. El importe histórico aplicado se conserva frente a modificaciones de precios futuros.
- `tesoreria_vencimientos_aplicaciones`: distribución de un movimiento entre vencimientos del mismo cargo. Las sumas no pueden superar el movimiento ni el pendiente de un vencimiento. El bloqueo transaccional compartido con revisión y edición de cargos evita que dos pagos consuman simultáneamente el mismo saldo.
- `tesoreria_revision_decisiones`: motivo, actor, evidencia relevante, huella y revocación. Los comentarios y la marca revisado no forman parte de la huella. La migración copia los descartes previos como instantáneas, sin modificar los movimientos ni convertirlos en criterios reutilizables.
- `tesoreria_revision_criterios`: autorización explícita para repetir una explicación de cargos distintos. Se limita a los mismos cargos, programación, conceptos, importes, número de movimientos y un máximo de diez días. Se puede revocar sin borrar la decisión histórica.

La revisión directa (acción interna `force-review`) no aprende reglas ni aplica propuestas de asociación. Volver a pendiente conserva las aplicaciones. Eliminar un movimiento elimina sus aplicaciones mediante FK; las decisiones mantienen la evidencia histórica. Eliminar o reasignar un cargo no convierte sus aplicaciones antiguas en pagos válidos de otro cargo: la comparación indica que deben revisarse.

## Criterios y límites

La ventana histórica empieza dos años antes del movimiento seleccionado más antiguo. Incluye los propios seleccionados. Solo el importe no relaciona movimientos: se necesita el cargo o un concepto suficientemente identificable y compatible con su destinatario. Se eliminan del concepto meses, fechas y referencias explícitas; se conservan números de local/contrato. No se utiliza un modelo de IA para decidir pagos.

Los vencimientos periódicos necesitan primer vencimiento (`inicio_dia`, `inicio_mes`, `inicio_anio`). No se deduce a partir de la fecha de creación del cargo. En meses cortos se ajusta al último día y se recupera el día original en el siguiente mes. Las reglas por fechas mantienen sus fechas explícitas. Una previsión vencida sin aplicación se muestra como contexto, nunca como prueba de impago: no existe un registro de cobertura completa de extractos.

La interfaz muestra una tarjeta por movimiento y explica la fase actual. La fase 0 permite elegir completa/directa antes de mostrar las fases 1–5. La directa se confirma allí con comentario; la completa avanza a fase 1 y la pregunta inicial desaparece. La fase 1 no avanza automáticamente: se continúa mediante el botón. Ingresos conservan su clasificación. El desplegable «Análisis de potenciales riesgos de duplicado o error» contiene un desplegable por movimiento seleccionado, incluidos aquellos sin incidencias. Su resumen indica posibles incidencias, falta de datos o ausencia de incidencias pendientes; el interior filtra avisos y comparaciones por identificador y previsiones/notas por el cargo de ese movimiento. Los avisos compartidos conservan una sola decisión y explican su alcance en cada movimiento afectado. Fases 4 y 5 recalculan la comparación con las asignaciones provisionales. Las decisiones preparadas desactualizadas se deben retirar; el servidor vuelve a validarlas al guardar. Los enlaces de comparación abren fichas en otra pestaña.

La fase 2 utiliza `ReviewRecipientTable` para elegir proveedor, cliente o empleado desde una fila, con filtros combinados por columna. El tipo conserva su selector. La selección de fila es obligatoria y se borra al cambiar de tipo; filtrar no cambia la selección y se indica si queda oculta. La asignación compacta de proveedor utiliza la misma tabla. El modo de asociar cargo conserva su destinatario bloqueado y los ingresos conciliados conservan el destinatario procedente de sus órdenes/remesas.

La introducción «Antes de empezar» está fuera del recuadro de movimientos y precede a «¿Cómo quieres revisar?». En fase 1 el análisis general siempre es visible; solo se pliega el análisis de cada movimiento. Las identidades de destinatarios se toman según su tipo: `id_proveedor`, `id_cuenta` o `id_agente`. El agente comercial de una cuenta no identifica al cliente. La tabla consolida las filas recibidas con el mismo identificador y conserva clientes distintos aunque compartan agente.

## Instalación y comprobación

Migración aditiva: `database/migrations/20260920_0001_bank_review_memory.sql`. `node --experimental-default-type=module scripts/migrate-bank-review-memory.mjs` inspecciona únicamente las columnas; `--apply` instala dentro de una transacción con espera de bloqueo de tres segundos. No reinicia procesos. La API indica expresamente si aún falta la migración.

Pruebas:

- `scripts/test-bank-review-analysis.mjs`: coincidencias, recibos seleccionados, historia trimestral/anual, identidades, cambios de importe, reglas y tercer recibo.
- `scripts/test-bank-review-memory.mjs`: migración idempotente, persistencia JSONB, revocación, cambios concurrentes, asignaciones, límites y rollback en esquema aislado de RDS.
- `scripts/test-bank-review-workflow.mjs`: guardado atómico junto con revisión/asignaciones, además de las regresiones de nóminas e ingresos.
- `scripts/test-bank-review-memory-ui.cjs` y `scripts/test-bank-income-ui.cjs`: interacción en jsdom. Requieren `P3_SELECTOR_TEST_MODULES` apuntando a un directorio de módulos que contenga jsdom.
# Planificación materializada de proveedores

La migración `20260920_0002_recurring_charge_horizon.sql` añade `termina_planificacion` y `planificado_hasta` a los cargos recurrentes. Los nuevos cargos de proveedores guardan sus vencimientos en `tesoreria_cargos_vencimientos` hasta dos años desde hoy. El primer vencimiento toma hoy por defecto; su fecha y periodicidad son editables. La ampliación manual parte del último vencimiento por regla y respeta la marca de finalización. La revisión bancaria usa esos vencimientos guardados para los cargos materializados, sin inferir nuevas obligaciones indefinidamente. Las aplicaciones bancarias conservan sus datos históricos al editar la programación.
