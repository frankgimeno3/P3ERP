# Nóminas por empleado y tareas

La ficha de nómina es única por empleado (`laboral_empleados_en_nomina.id_empleado`). Un trigger de RDS la crea al insertar un cargo recurrente de tipo nómina o cambiar su empleado/tipo; reutiliza la ficha existente. La migración incorpora también los cargos anteriores y se puede ejecutar de nuevo sin duplicarlos.

La ficha agrupa los cargos recurrentes del empleado y los movimientos vinculados mediante `tesoreria_movimientos_bancarios.id_cargo_recurrente`. El concepto bancario por sí solo no crea ni vincula una nómina. Las liquidaciones mensuales siguen en `laboral_nominas` y los anticipos en `laboral_anticipos`; no se alteran sus importes históricos. Los anticipos confirmados desde revisión bancaria aparecen en Anticipos, en la ficha del empleado y etiquetados como anticipo en el historial bancario. Volver a revisar la misma transferencia no duplica su anticipo.

El endpoint `laboral_nominas-empleados` expone fichas agregadas; `laboral_nominas` conserva su contrato de liquidaciones mensuales. La ficha del cargo recurrente permite editar su programación y comprueba que no haya cambiado desde la lectura. Sus cambios no alteran los importes bancarios anteriores.

`laboral_tareas_empleado` registra id, nombre, agente, estado y descripción. La API de tareas filtra por agente y valida el agente también al editar una tarea. Los estados son pendiente, en curso, completada y cancelada.

El panel abre en «Mis tareas pendientes», consultando la identidad autenticada
del servidor. `/tareas` separa pendientes/en curso de completadas/canceladas;
`/tareas/{id}` muestra el detalle. El middleware redirige a `/` si un agente
sin rol Operaciones o superior intenta abrir una tarea ajena. La API
`/api/v1/tareas` comprueba también propiedad y permisos, sin confiar en la
identidad del navegador. La vista personal es de consulta.

`/dashboard/operaciones/tareas` lista agentes con cuenta de empleado y sus
totales. La ficha `/{id_agente}` permite crear tareas y abrir el detalle en
modo edición. Crear y editar exige Operaciones o superior. Se reutiliza la
tabla existente, sin duplicar tareas ni crear otra tabla.

Desde el dashboard cada agente puede agregar sus propias tareas mediante
un modal. `POST /api/v1/tareas/propias` fija agente e inicio pendiente en el
servidor usando la identidad autenticada; no acepta asignaciones del navegador.
La creación para otros agentes y la edición siguen reservadas a Operaciones.

Pruebas: `scripts/test-task-workflow.mjs` usa un esquema aislado de RDS para
verificar propiedad, permisos, creación y cambios de estado;
`scripts/test-tasks-magazines-ui.cjs` comprueba pestañas y navegación.

Aplicación: `node --experimental-default-type=module scripts/migrate-employee-payroll-tasks.mjs`.

Verificación: `node --experimental-default-type=module scripts/test-bank-review-workflow.mjs`. Usa un esquema aislado que se revierte al terminar: comprueba nóminas, anticipos, asociación sin liquidación, exclusión de movimientos sin cargo asociado, migración repetida, tareas y edición de previsiones con detección de cambios concurrentes.
# Tareas asociadas a cuentas

La pestaña Tareas de la ficha comercial guarda una única tarea en
`comercial_cuenta_tareas` y sus responsables en `comercial_cuenta_tarea_agentes`.
Debe existir al menos un agente activo con cuenta de empleado; la API y un
constraint trigger diferido impiden guardar tareas sin responsables.
Comercial, Administración, Operaciones, Dirección y Superadmin gestionan estas
tareas. Los agentes asignados pueden cambiar su estado desde `/tareas/{id}`.
Las listas personales y los contadores de Operaciones consultan la misma tarea,
sin copiarla por agente. Las tareas laborales existentes conservan sus permisos.
Las actualizaciones usan `updated_at` como versión para detectar cambios concurrentes
y registran el cambio en el historial de la cuenta. La migración es
`20261006_0002_account_tasks.sql`; `scripts/test-account-tasks.mjs` verifica el
flujo en un esquema aislado.
