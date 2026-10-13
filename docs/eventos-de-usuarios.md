# Eventos de usuarios

La página `/dashboard/direccion/eventos-de-usuarios` consulta el historial de escritura de P3ERP. Solo Dirección y Superadmin pueden acceder. No determina ubicaciones: guarda la dirección recibida por el servidor, su cabecera de origen y el instante del cambio.

## Circuito de escritura

El middleware autentica con Cognito, resuelve el agente y firma el contexto de una solicitud de escritura. `AuditedClient` verifica esa firma y establece `p3.user_event_context` únicamente dentro de la transacción de PostgreSQL. Tanto pg como Sequelize usan ese cliente. Commit o rollback limpian el contexto; no se atribuyen operaciones de otro usuario al reutilizar conexiones.

Los triggers `p3_user_events_row` y `p3_user_events_truncate` registran crear, editar y borrar en todas las tablas públicas de negocio. Conservan la clave, valores anteriores y nuevos, cambios individuales de JSON, relaciones, solicitud y transacción. Los borrados relacionados conservan sus datos antes de desaparecer y la página los agrupa con la solicitud original. Una transacción revertida también revierte sus eventos.

Las escrituras de `eventos_de_usuarios` no tienen capturador. El historial bloquea actualizar y vaciar. Por instrucción del usuario, permite borrar una selección confirmada desde Eventos de usuarios: la API verifica Dirección/Superadmin, DELETE y confirmación explícita, y habilita el permiso de borrado solo dentro de esa transacción. El borrado del propio historial no genera otro evento. Las consultas, login y logout no se registran. Credenciales y tokens se ocultan; archivos binarios se identifican mediante tamaño y SHA-256 sin duplicar su contenido.

## Obligaciones al ampliar el ERP

1. Reutiliza los clientes de base de datos compartidos. No crees un Pool, Client o conexión Sequelize alternativos.
2. Toda migración que cree tablas debe ejecutar `SELECT public.p3_install_user_event_triggers()` antes de insertar datos en ellas. El cliente instala cobertura después de un CREATE TABLE separado; para lotes de migración, la llamada explícita es obligatoria. La vista de eventos avisa de tablas sin cobertura.
3. Los campos nuevos se leen del catálogo de PostgreSQL y sus cambios se capturan automáticamente. Comprueba que el nombre de entidad, sus asociaciones y los cambios sean comprensibles; amplía `p3_user_event_entity` cuando corresponda. Si un campo contiene credenciales o adjuntos, verifica su protección y no vuelques secretos en la descripción.
4. Si la funcionalidad cambia recursos fuera de PostgreSQL, usa `externalUserEvent` tras el cambio confirmado, con una instantánea segura anterior/nueva. No pases cuerpos completos de solicitudes, passwords, tokens, cookies ni respuestas SDK sin filtrar.
5. Para operaciones autorizadas de mantenimiento sin HTTP, usa `withUserEventContext` con el agente real, nombre, identificador de solicitud, método, origen y `enabled:true`. Deja la IP nula si no se conoce; no inventes una IP ni una ubicación.
6. Separa BEGIN, COMMIT y ROLLBACK del SQL de negocio. No mezcles controles de transacción en lotes auditados. No compartas una conexión en transacción entre solicitudes diferentes.
7. Prueba altas, edición de campos, relaciones, borrados en cascada, rollback, reutilización de conexiones y ausencia de recursión. Ejecuta `scripts/test-user-events.mjs` y las pruebas pertinentes del dominio. No introduzcas datos de demostración permanentes para probar el historial.

Si se añade en el futuro cualquier módulo nuevo, su creación incluye este circuito de eventos desde el primer cambio; no es una tarea opcional para después.

## Comentarios y pruebas

La actividad automática de una cuenta se guarda exclusivamente en general_eventos (Registro de eventos, Datos de gestión). accountActivity no escribe en general_comentarios. Los comentarios son notas manuales, salvo el resumen comercial de una propuesta marcada expresamente como enviada y completa. Los registros sin autor identificado se presentan como ACCIÓN AUTOMÁTIZADA.

Las altas interactivas de cuentas, contactos y propuestas ofrecen Modo prueba inicialmente en Sí. El servidor usa es_prueba y PRUEBA-; contratos, contenidos, órdenes y facturas derivados conservan ambos. Los triggers impiden convertir datos de prueba en reales o crear derivados con IDs reales. Las importaciones y datos existentes conservan su modo previo.
