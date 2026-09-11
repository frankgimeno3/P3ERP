<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

- Nunca ejecutes `npm run dev`, `pnpm dev`, `yarn dev` o comandos equivalentes sin pedirme permiso explícito.
- Si el servidor de desarrollo ya está ejecutándose, nunca lo detengas, reinicies ni mates el proceso sin mi autorización.
- Antes de ejecutar cualquier comando que pueda afectar procesos en ejecución, pregúntame primero.
- En formularios de la aplicación, las fechas nunca deben ser un único input ni `type="date"`: deben representarse siempre como 3 inputs separados para `dd`, `mm` y `yyyy`, respectivamente.
- Toda pestaña, enlace, fila interactiva o botón habilitado debe mostrar `cursor: pointer` y una respuesta visual al pasar el cursor. Los controles deshabilitados no deben aparentar ser interactivos.
- Todo modal debe tener un botón visible `×` para cerrarlo y debe poder cerrarse también pulsando `Escape`.
- Todo selector con búsqueda debe usar `app/components/SearchableSelect.tsx`: un único campo que abre las opciones al pulsarlo y las filtra al escribir. No crear un input de búsqueda separado de un select o listado de opciones. Es obligatorio elegir una opción válida; el texto escrito no es una selección y editarlo invalida la selección anterior. Los filtros generales de tablas y los buscadores de navegación no son selectores y conservan su función.
- El menú lateral del dashboard se define únicamente en `app/config/dashboardMenu.ts`. Al añadir, eliminar o renombrar una página del menú, debe actualizarse también su explicación en `app/dashboard/comercial/documentacion/guias.json`. Si cambia el funcionamiento de una página existente, su guía JSON debe actualizarse en el mismo cambio.
<!-- END:nextjs-agent-rules -->
