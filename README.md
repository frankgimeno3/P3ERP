# P3ERP

ERP con Next.js, PostgreSQL/RDS, Cognito y almacenamiento S3.

- [Mapa operativo y convenciones](AGENTS.md): punto de entrada para trabajar en el repositorio.
- [Esquema de datos](database/schema.md) y [migraciones](database/migrations/): consultar solo las tablas relacionadas con la tarea.
- [Guías funcionales](app/dashboard/comercial/documentacion/guias.json): documentación por ruta.
- Scripts disponibles en [package.json](package.json); pruebas por dominio en [scripts](scripts/).

Para revisar archivos potencialmente sin uso: `node scripts/audit-repository.mjs`. El informe no elimina nada; requiere comprobar usos dinámicos y operativos.

No iniciar, detener ni reiniciar el servidor sin autorización. No eliminar migraciones aplicadas ni ejecutar importadores como pruebas.
