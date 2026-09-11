# Auditoría del pedido de revisión bancaria y proveedores

Revisión del código y pruebas de integración. No se ha realizado validación visual en un navegador autenticado.

| Requisito | Implementación comprobada |
| --- | --- |
| Fase 1: solo coincidencias por importe y concepto del mes o anterior | Dos subsecciones en `BankReviewWizard`; el estado de selección se añade al modal |
| Abrir coincidencias en otra pestaña | Enlaces con `target="_blank"` y `rel="noopener noreferrer"` |
| Volver atrás para cualquier tipo | Navegación común de fases y botón Volver atrás |
| Nóminas también con fases 3, 4 y 5 | El mismo asistente para proveedor, cliente y nómina |
| Elegir completa, anticipo o adicional en fase 2 | Selector obligatorio antes de avanzar |
| Nómina recurrente en fase 3 | Selector de cargo, regla y nómina mensual/periodo |
| Adicional puntual | Diferencia en fase 4, resumen explícito en fase 5 y validación transaccional; conserva recurrente |
| Anticipo asociado a nómina mensual en RDS | Registro en `anticipos_empleados` y relación en `nominas.anticipos` por empleado y periodo |
| Completa: neto menos anticipos igual a transferencia | Cálculo y comprobación en cliente y servidor |
| Sin anticipos ni compensaciones | Mensaje en fase 4 cuando no hay anticipos; los pendientes se muestran aparte sin descontarlos |
| Subir nómina recurrente si completa mayor y sin anticipos | Opción explícita en fase 4 y resumen en fase 5 |
| Subir cargo previsto de proveedor | Opción en fase 4; actualización de programación al confirmar |
| IVA automático, inicialmente Con IVA | Interruptor compartido, total / 1,21 o total sin IVA |
| Revisión final también para ingresos | Fase 5 con destinatario, importe y orden seleccionada |
| Revisión múltiple con el mismo contenido | Listado y ficha usan `BankReviewWizard` |
| Bloquear revisados mezclados con pendientes | Aviso en fase 1 y validación en servidor |
| Uno o varios revisados: botón rojo NO revisado | Acción con confirmación; conserva asignaciones y pagos |
| Cabezal Asignado a | Sustituido en el listado |
| País en un único campo desplegable y filtrable | `SupplierCountrySelect` en Crear proveedor |
| Crear cargo desde proveedor | `SupplierActions` usa `RecurringChargeModal`, compartido con liquidez |
| Crear ticket y factura desde proveedor | Accesos a formularios existentes con proveedor preseleccionado |
| Agregar producto/servicio en precios | Modal y API para `proveedores_benchmark`: servicio, descripción, unidad y precio por unidad |
| Filtro con/sin proveedor | Selector en listado de revisión |
| Mismo proveedor: aviso y continuar | Conserva asignación común y permite avanzar |
| Otro proveedor: omitir o sobrescribir cada incidencia | Decisión individual obligatoria; incluye propietarios de pagos/cargos vinculados |
| Ver y asociar recurrentes al asignar proveedor | Fase 3 filtrada por destinatario |
| Crear recurrente aunque existan otros del proveedor | Formulario compartido en fase 3; permite aplicarlo a todas sus líneas |
| Botón Asignar a cargo previsto | Exige cargos ya asignados a proveedor o empleado; rechaza ingresos |

Correcciones adicionales de esta auditoría: resumen final completo; revisión repetida de adicionales sin duplicar importes; avisos de propietarios indirectos; validación previa de nóminas ya pagadas y periodos; estado de selección limitado al contexto correspondiente.

Pruebas: `scripts/test-bank-review-workflow.mjs` usa un esquema aislado y revierte todos sus datos. Cubre nómina completa, anticipo, adicional, subidas, IVA, asignaciones, omisiones, sobrescrituras, selección mezclada, ingresos, cambios concurrentes, reversión transaccional, pago/orden, revisión repetida, anticipo y nómina en lote, edición laboral y almacenamiento benchmark.
