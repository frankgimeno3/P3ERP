# Optimización conservadora

Las lecturas de revistas, newsletters y propuestas ya no preparan el esquema ni ejecutan normalizaciones históricas. Las altas siguen creando sus publicaciones y páginas mediante las operaciones de negocio existentes.

## Despliegue

Antes de desplegar estos repositorios en otra base, aplicar explícitamente:

1. `database/migrations/20261008_0002_explicit_publication_proposal_schema.sql` (DDL antes integrado en peticiones).
2. `database/migrations/20261008_0003_publication_backfill.sql` (normalización histórica, solo durante la migración).

Sobre una instalación ya inicializada, ejecutar `node --experimental-default-type=module scripts/migrate-request-schema.mjs` para previsualizar en una transacción que se revierte. Añadir `--apply` para confirmar. El comando compara recuentos y huellas de todas las filas de nueve tablas, incluyendo timestamps, y rechaza la aplicación si cambiaría datos. Un entorno antiguo que necesite backfill requiere revisar ese cambio por separado; el comando no lo autoriza automáticamente. La presencia de `publicaciones_paginas_db` exige revisión, sin borrarla ni sobrescribir sus datos. Las newsletters antiguas se copian si la tabla existe, sin eliminarla.

La migración se probó y aplicó el 08/10/2026 sobre la base configurada sin diferencias en filas. Las actualizaciones históricas omiten filas cuyo valor ya es correcto; repetirlas conserva también `updated_at`. Los límites de espera de bloqueos y consultas evitan una espera indefinida.

## Líneas de propuestas

`replaceLineas` conserva la consulta agrupada de páginas y las especificaciones de reservas existentes. Inserta en lotes de hasta 500 filas (10.000 parámetros), dentro de la transacción de su llamador. Conserva los 20 valores de cada línea, identificadores, numeración, ceros y nulos. Una propuesta vacía borra las líneas sin emitir un INSERT vacío. Un error sigue propagándose para revertir toda la operación.

Comparación con `023f334`, usando un registrador de consultas y comprobando igualdad de todos los parámetros:

| Líneas | Consultas anteriores de replaceLineas | Consultas actuales | INSERT actuales |
| --- | ---: | ---: | ---: |
| 0 | 8 | 2 | 0 |
| 10 | 19 | 4 | 1 |
| 100 | 109 | 4 | 1 |
| 1001 | 1010 | 6 | 3 |

Estos recuentos incluyen las seis operaciones DDL retiradas de esa rutina; no representan todos los pasos de guardar una propuesta. La medición con registrador no estima latencia real de PostgreSQL.

## Medición reproducible

- `node --experimental-default-type=module scripts/benchmark-proposal-lines.mjs`: compara consultas y parámetros con el commit anterior sin escribir en la base.
- `node --experimental-default-type=module scripts/measure-read-paths.mjs`: mide tres lecturas por repositorio en una transacción PostgreSQL de solo lectura. Registra tiempos, consultas, filas y bytes, sin guardar SQL, parámetros ni contenido de clientes. No modifica el pool del servidor: se ejecuta en otro proceso.
- Los informes van a `TEMP/p3erp-tests` o `P3_TEST_REPORT_DIR`, fuera de Git.

Muestra del 08/10/2026 tras el cambio: propuestas, 3 consultas y 5.972 bytes (3 filas); revistas, 1 consulta y 71.415 bytes (82 filas); newsletters, 1 consulta y 139.110 bytes (237 filas). Lecturas repetidas: aproximadamente 68–69 ms, 28 ms y 37–47 ms, respectivamente. Son tiempos de repositorio sobre esta conexión, excluyen HTTP y renderizado y no constituyen un benchmark de producción ni una comparación temporal anterior/posterior.

## Verificación

`scripts/test-request-schema-integration.mjs` usa tablas clonadas en un esquema aislado dentro de una transacción revertida. Comprueba migraciones repetibles, conservación de datos y fechas, tablas antiguas, creación y edición de revistas/newsletters, lecturas sin escritura, lotes de 1001 líneas y rollback tras un fallo de unicidad en el segundo lote. La prueba local `test-proposal-page-batching.mjs` cubre parámetros, límites de lote y reservas.

Se han retirado estados y filtros sin consumidores de contacto, nóminas y formularios de previsiones/tesorería. Los selectores SearchableSelect mantienen sus opciones, búsqueda y selección. No se han cambiado reglas de facturación, conciliación, permisos, importes o saldos.

Los refactors extensos de bancos, facturación, mediateca y PropuestaEditor quedan como trabajos separados: su tamaño por sí solo no demuestra un problema de rendimiento. Medir primero y ampliar pruebas antes de modificar esas reglas.
