# Contraste de la interfaz

El ERP usa superficies claras para el contenido y texto oscuro por defecto.
La preferencia de tema oscuro del sistema no debe invertir el texto heredado
sobre páginas, tarjetas o modales blancos. La navegación conserva sus fondos
oscuros con texto claro explícito. Los colores propios de GM se mantienen.

La revisión de octubre de 2026 abarca los 356 archivos TS/JS de interfaz y las
136 rutas `page` del árbol `app`, además de las hojas de estilo compartidas,
laborales, de previsión de liquidez y del documento de factura. Se corrigieron
etiquetas, estados, botones, formularios, cabeceras, migas de navegación y
estados hover con poco contraste. Las correcciones afectan a 78 archivos de
interfaz, incluidos componentes que heredan fondos claros de sus páginas.
La página de propuestas usa ahora campos
y filas claras; el hover general de GM conserva los colores de cada control.
Los importes negativos de la previsión conservan el rojo con un tono más oscuro.

`node scripts/audit-ui-contrast.cjs --summary` revisa colores Tailwind, valores
hexadecimales, herencia JSX, variantes condicionales y hover. Puede generar el
detalle con `--output <archivo.json>`. Calcula la luminancia de la paleta instalada
y marca combinaciones por debajo de 4,5:1, incluidos textos pequeños. Es una
herramienta de revisión estática, no una certificación de accesibilidad: no conoce
todos los contextos entre componentes, portales, estilos dinámicos o imágenes.

Los seis candidatos restantes del análisis se revisaron en su contexto:

- `BankReviewWizard`: el contenedor oscuro solo es el fondo del modal; `content`
  inserta una sección blanca con texto `slate-900`.
- `JuanAddRow`: el error está dentro de la sección blanca del modal; la variante
  embebida hereda la superficie clara de la previsión.
- `loggedLeftMenu`: `MenuEntry` hereda el fondo `gray-900` del menú. Sus tres
  combinaciones señaladas como si el fondo fuese blanco tienen contraste sobre
  el fondo oscuro real.
- `CuentaShell`: el marco azul contiene `Cabezal` y componentes hijos que definen
  sus superficies claras. La expresión `children` no es texto sobre el marco.

`node scripts/test-ui-contrast.cjs` comprueba las combinaciones de los estilos
compartidos y evita regresiones del tema del sistema y del hover de GM.
Se midió también el contraste de muestras cargadas en el navegador de tareas,
cuentas, contactos, propuestas, revistas, facturas y conciliación. Esta revisión
visual es una muestra; no cubre todas las rutas, modales o estados posibles.
La sesión caducó al principio y posteriormente volvió a estar disponible.
No se arrancó, detuvo ni reinició el servidor de desarrollo.
