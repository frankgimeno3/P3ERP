# Nóminas por empleado y tareas

La ficha de nómina es única por empleado (`laboral_empleados_en_nomina.id_empleado`). Un trigger de RDS la crea al insertar un cargo recurrente de tipo nómina o cambiar su empleado/tipo; reutiliza la ficha existente. La migración incorpora también los cargos anteriores y se puede ejecutar de nuevo sin duplicarlos.

La ficha agrupa los cargos recurrentes del empleado y los movimientos vinculados mediante `tesoreria_movimientos_bancarios.id_cargo_recurrente`. El concepto bancario por sí solo no crea ni vincula una nómina. Las liquidaciones mensuales siguen en `laboral_nominas` y los anticipos en `laboral_anticipos`; no se alteran sus importes históricos. Los anticipos confirmados desde revisión bancaria aparecen en Anticipos, en la ficha del empleado y etiquetados como anticipo en el historial bancario. Volver a revisar la misma transferencia no duplica su anticipo.

El endpoint `laboral_nominas-empleados` expone fichas agregadas; `laboral_nominas` conserva su contrato de liquidaciones mensuales. La ficha del cargo recurrente permite editar su programación y comprueba que no haya cambiado desde la lectura. Sus cambios no alteran los importes bancarios anteriores.

`laboral_tareas_empleado` registra id, nombre, agente, estado y descripción. La API de tareas filtra por agente y valida el agente también al editar una tarea. Los estados son pendiente, en curso, completada y cancelada. Las tareas importadas de vtiger admiten agente y cuenta nulos; conservan todos los campos de origen en `vtiger_original`, inicio/fin sin conversión de zona horaria y una clave de importación única. Las tareas nuevas creadas manualmente siguen exigiendo agente.

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

La pestaña Calendario consulta `/api/v1/tareas/calendario`, reservado a gestión,
y reúne tareas internas, importadas y de cuentas. Muestra doce meses del año
seleccionado a la izquierda y filtros agrupados y tarjetas a la derecha.
Las tareas importadas sin agente asociado tienen también una sección propia.

`/dashboard/operaciones/tareas/importar` gestiona cuatro fases: CSV, agentes,
cuentas y confirmación. `/api/v1/tareas/importar` valida el lote completo antes
de guardar. No infiere asociaciones ni crea entidades; los vínculos expresos
son opcionales y se validan contra las entidades existentes. Confirmar usa una
transacción; un fallo revierte todo el lote. La clave combina el hash de los
campos originales ordenados y la aparición de cada registro idéntico. Repetir
el archivo no duplica ni sobrescribe tareas. Al no existir ID de vtiger en esta
exportación, un registro modificado se considera nuevo. Los campos de origen
permanecen intactos aunque se edite la tarea. Las fechas sin hora se representan
a las 00:00 y se advierten en la revisión, sin alterar el texto original.

Migración: `node --experimental-default-type=module scripts/migrate-vtiger-tasks.mjs --apply`.
La importación operativa también puede ejecutarse con
`node --experimental-default-type=module scripts/import-vtiger-tasks.mjs --file <CSV> --actor <id_agente> --apply`.
Comprueba el rol real del agente en la base de datos, deja los vínculos sin
asociar y verifica todos los campos originales después de guardar. Sin `--apply`
solo revisa el archivo y las coincidencias existentes.
Pruebas: `scripts/test-vtiger-tasks.mjs` (CSV y validaciones sin RDS) y
`scripts/test-vtiger-tasks-integration.mjs` (esquema temporal aislado y eliminado
al terminar: transacción, duplicados, asociaciones opcionales, permisos y versiones).

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
