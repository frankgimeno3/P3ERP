# Nóminas por empleado y tareas

La ficha de nómina es única por empleado (`nominas_empleados.id_empleado`). Un trigger de RDS la crea al insertar un cargo recurrente de tipo nómina o cambiar su empleado/tipo; reutiliza la ficha existente. La migración incorpora también los cargos anteriores y se puede ejecutar de nuevo sin duplicarlos.

La ficha agrupa los cargos recurrentes del empleado y los movimientos vinculados mediante `lineas_bancos.id_cargo_recurrente`. El concepto bancario por sí solo no crea ni vincula una nómina. Las liquidaciones mensuales siguen en `nominas` y los anticipos en `anticipos_empleados`; no se alteran sus importes históricos. Los anticipos confirmados desde revisión bancaria aparecen en Anticipos, en la ficha del empleado y etiquetados como anticipo en el historial bancario. Volver a revisar la misma transferencia no duplica su anticipo.

El endpoint `nominas-empleados` expone fichas agregadas; `nominas` conserva su contrato de liquidaciones mensuales. La ficha del cargo recurrente permite editar su programación y comprueba que no haya cambiado desde la lectura. Sus cambios no alteran los importes bancarios anteriores.

`agentes_tareas` registra id, nombre, agente, estado y descripción. La API de tareas filtra por agente y valida el agente también al editar una tarea. Los estados son pendiente, en curso, completada y cancelada.

Aplicación: `node --experimental-default-type=module scripts/migrate-employee-payroll-tasks.mjs`.

Verificación: `node --experimental-default-type=module scripts/test-bank-review-workflow.mjs`. Usa un esquema aislado que se revierte al terminar: comprueba nóminas, anticipos, asociación sin liquidación, exclusión de movimientos sin cargo asociado, migración repetida, tareas y edición de previsiones con detección de cambios concurrentes.
