<!-- BEGIN:nextjs-agent-rules -->
En tablas con filtros, salvo petición explícita en contrario, los filtros de todas las columnas deben estar reunidos en una única tarjeta desplegable, inicialmente cerrada. Al abrirla se muestran todos juntos, con su etiqueta en letra fina justo encima de cada campo. Usar app/components/TableFilters.tsx; no crear desplegables individuales por columna.
# This is NOT the Next.js you know

Consulta la guía pertinente en `node_modules/next/dist/docs/` antes de escribir código Next.js. Si no existe (instalación 15.5.19 revisada), no recorras dependencias buscándola: consulta la documentación oficial de esa versión cuando sea necesario.

- Nunca ejecutes `npm run dev`, `pnpm dev`, `yarn dev` o comandos equivalentes sin pedirme permiso explícito.
- Si el servidor de desarrollo ya está ejecutándose, nunca lo detengas, reinicies ni mates el proceso sin mi autorización.
- Antes de ejecutar cualquier comando que pueda afectar procesos en ejecución, pregúntame primero.
- En formularios de la aplicación, las fechas nunca deben ser un único input ni `type="date"`: deben representarse siempre como 3 inputs separados para `dd`, `mm` y `yyyy`, respectivamente.
- Toda pestaña, enlace, fila interactiva o botón habilitado debe mostrar `cursor: pointer` y una respuesta visual al pasar el cursor. Los controles deshabilitados no deben aparentar ser interactivos.
- Todo modal debe tener un botón visible `×` para cerrarlo y debe poder cerrarse también pulsando `Escape`.
- Todo selector con búsqueda debe usar `app/components/SearchableSelect.tsx`: un único campo que abre las opciones al pulsarlo y las filtra al escribir. No crear un input de búsqueda separado de un select o listado de opciones. Es obligatorio elegir una opción válida; el texto escrito no es una selección y editarlo invalida la selección anterior. Los filtros generales de tablas y los buscadores de navegación no son selectores y conservan su función.
- El menú lateral del dashboard se define únicamente en `app/config/dashboardMenu.ts`. Al añadir, eliminar o renombrar una página del menú, debe actualizarse también su explicación en `app/dashboard/comercial/documentacion/guias.json`. Si cambia el funcionamiento de una página existente, su guía JSON debe actualizarse en el mismo cambio.
<!-- END:nextjs-agent-rules -->

## Mapa operativo

- ERP Next.js App Router + React 19, TS/JS y Tailwind. Alias `@/` = raíz.
- Flujo habitual: `app/dashboard/<área>` → `app/service/*Service.js` / `app/apiClient.js` → `app/api/v1/**/route.js` → `server/features/<dominio>/*Repository.js`.
- Áreas UI: comercial, administración, dirección (bancos/laboral), producción, operaciones y mediateca. Algunas páginas reexportan otras: sigue el import antes de editar.
- UI compartida: `app/components/`, `app/general_components/`; configuración: `app/config/`. `app/gm/` tiene su propio acceso.
- PostgreSQL/RDS: `server/database/pgClient.js` (SQL con pg); también existe Sequelize en `server/database/database.js`. Esquema: `database/schema.md`; cambios: `database/migrations/`. Contrasta la tabla con sus migraciones recientes.
- Autenticación/permisos: `middleware.js`, `server/features/authentication/`, `authorization/`; arranque: `instrumentation*.js`.
- Documentación bajo demanda: `docs/selectores-con-busqueda.md`, `docs/nominas-empleados-y-tareas.md`, `docs/revision-bancaria-memoria.md`. Las guías de usuario están en el JSON indicado arriba; lee solo la clave de la página.

## Localizar sin recorrer todo

1. Parte de la URL, archivo o error aportado; usa `rg --files app/dashboard/<área>` y sigue imports, endpoint y repositorio.
2. Busca símbolos con `rg -n -F "símbolo" <carpetas-implicadas>`; usa `rg -l` si solo necesitas nombres. Amplía el alcance únicamente si faltan referencias.
3. Localiza pruebas con `rg --files scripts -g '*test*<tema>*'`. Lee fragmentos y diff acotados; no vuelques archivos grandes ni repitas lecturas ya disponibles.
4. Evita por defecto `node_modules/`, `.next/`, `.git/`, `out/`, `build/`, `coverage/`, `.vercel/`, logs, `*.tsbuildinfo`, `next-env.d.ts` y `package-lock.json`. No uses `rg --no-ignore` global.
5. Assets de `public/`, catálogos de `app/data/` y `app/contents/`, migraciones históricas y otros dominios: solo si la tarea los requiere. No leer `.env*` ni certificados salvo necesidad explícita; no mostrar secretos.
6. Mantén este mapa estable; no añadas historiales de sesiones ni dupliques las guías.
7. Limpieza: `node scripts/audit-repository.mjs` detecta candidatos sin borrar nada. Revisa cargas dinámicas y usos operativos; conserva migraciones y pruebas. No recorras de nuevo todo el repositorio para tareas locales.

## Comandos (PowerShell, desde la raíz)

- Desarrollo: `npm run dev`, sujeto al permiso de arriba.
- Tipos: `node node_modules/typescript/bin/tsc --noEmit --incremental false`.
- Lint acotado: `node node_modules/eslint/bin/eslint.js <archivos>`; preferirlo al script heredado `npm run lint` (`next lint`).
- Prueba pertinente: `node --experimental-default-type=module scripts/test-<tema>.mjs` o `node scripts/test-<tema>.cjs`. No hay script `npm test`. Revisa requisitos: algunas usan RDS y otras necesitan jsdom mediante `P3_SELECTOR_TEST_MODULES`; no ejecutes migradores/importadores como pruebas.
- Build: `npm run build`; escribe en `.next/`, así que pide permiso si puede afectar al servidor activo. `npm start` apunta a un build standalone, no habilitado en la configuración actual.
- Cambios documentales: revisar diff/enlaces; no ejecutar build ni pruebas de aplicación.
