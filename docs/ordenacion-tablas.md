# Ordenación de tablas

Las tablas de la aplicación usan `app/components/SortableTable.tsx`. Mantiene
los atributos de una tabla HTML y acepta sus elementos `thead`, `tbody` y
`tfoot`. Añade el mismo SVG de Cuentas en cada columna de datos; los encabezados
agrupados con `colSpan` representan grupos, no columnas independientes.

El primer clic ordena ascendente y el siguiente descendente. La comparación
reconoce fechas dd/mm/yyyy e ISO, importes y números con formato español,
identificadores naturales y texto sin distinguir mayúsculas o acentos. Los
vacíos quedan al final en ambos sentidos. La ordenación conserva las claves
React de las filas, sus controles y sus acciones. Las filas de sección y totales
con celdas combinadas quedan fijas; también puede marcarse una fila con
`data-sort-fixed`. Las filas desplegadas deben agruparse con la fila principal
en un Fragment con clave. Para un valor diferente al mostrado, usar
`data-sort-value` en la celda. Los iconos se ocultan al imprimir.

En tablas paginadas, pasar `sort` y `onSortChange` para aplicar la comparación
antes de paginar, o enviar columna y sentido a la API. Contactos, Cuentas y
el buscador de cuentas ordenan en SQL mediante listas de columnas permitidas;
Contratos ordena la colección filtrada antes de cortar la página. Cambiar el
orden vuelve a la primera página. Cuentas conserva su cabecera existente con
la misma función.

Pruebas: `scripts/test-table-sorting.cjs` (jsdom mediante
`P3_SELECTOR_TEST_MODULES`), `scripts/test-contact-sorting.mjs` (esquema aislado
en PostgreSQL) y `scripts/test-account-sorting.mjs`. No requieren iniciar ni
reiniciar el servidor. La primera comprueba también que el footer legal de
Verifactu solo aparece bajo `/dashboard/administracion`.
