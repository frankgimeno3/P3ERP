# Registro de facturas de clientes

`scripts/import-invoice-register.mjs <archivo.xlsx>` revisa las hojas con
columnas Nº FRA, FECHA EMISION, CODIGO, CLIENTE, TOTAL NAC + IVA, TOTAL UE,
TOTAL RESTO y FORMA DE COBRO opcional. Los números reservados sin datos no son
facturas. Se leen las fechas por sus componentes Excel, evitando cambiar el día
por la zona horaria. Los totales nacionales incluyen IVA del 21 %; UE y resto se
guardan sin IVA según las columnas del registro. Los negativos son abonos.

Con `--apply` aplica el lote en una transacción, tras guardar una copia de las
facturas, líneas, órdenes y recibos afectados en el directorio temporal
`p3-invoice-register`. La revisión y el informe quedan en ese directorio.
La transacción usa el bloqueo de conciliación y evita cambios concurrentes en
las tablas implicadas. No admite sobrescribir facturas emitidas o contabilizadas.

La coincidencia exacta de número conserva el identificador existente. Se
mantienen la cuenta y los vínculos a órdenes, contratos, recibos y remesas. Sin
cuenta previa, se busca el código Edisoft o una coincidencia única por nombre;
si no existe, se crea una cuenta mínima identificada por el código del registro.
Sin órdenes previas, se crea una orden pendiente para facturas positivas, sin
inventar vencimiento, banco, remesa ni estado de cobro. Los abonos no generan
órdenes de ingreso negativas. El registro no identifica sus facturas originales,
por lo que no se infiere ese vínculo solo a partir del importe.

Las líneas válidas se conservan. Cuando el desglose existente no coincide,
se guarda en `datos_importacion.registro_facturas.lineas_anteriores` y se utiliza
el importe del registro con una descripción explícita de la falta de desglose.
No se modifican los importes ni los estados de órdenes cobradas o conciliadas.
Sus diferencias se guardan y se muestran en la ficha de la factura. La repetición
del mismo archivo no duplica facturas ni órdenes.

`scripts/test-invoice-register.mjs` comprueba fechas, coincidencias, abonos,
copia previa, conservación de remesas y cobros, idempotencia y rollback en un
esquema PostgreSQL aislado.

# Revisión de clientes y columnas del listado

La revisión adicional de clientes se ejecuta con
`node --experimental-default-type=module scripts/reconcile-invoice-customers.mjs`.
Sin `--apply` solo informa; con esa opción guarda una copia previa en la carpeta
temporal y completa campos ausentes de facturas editables en una transacción.
Prioriza la cuenta de las órdenes vinculadas y después la coincidencia única
del nombre fiscal. Agrupa los nombres ambiguos para consultarlos al usuario.
Los totales originales prevalecen sobre la clasificación por país; los países
desconocidos y las formas de cobro ausentes quedan pendientes. No modifica
órdenes, recibos, remesas ni cobros confirmados. Repetirlo no añade cambios.
`scripts/test-invoice-customer-matching.mjs` verifica estas reglas.

# Facturas y recibos originales de publicidad

`PublicidadPdfParser.js` lee texto y posiciones extraídos de PDF: cabecera,
dirección fiscal, NIF, servicios, descuentos, IVA y vencimientos. Valida fechas
y que las líneas, impuestos y cobros sumen los importes de la factura.
Los documentos escaneados requieren revisión visual y transcripción verificada.
Los PDF de recibos se contrastan por factura, número, importe y vencimiento.

`scripts/import-publicidad-pdfs.mjs <carpeta> --apply` aplica lotes de 20 sobre
un manifiesto revisado y guarda copia previa de cada lote. Las discrepancias
de numeración deben resolverse antes de incluir esos documentos. El PDF
prevalece sobre el registro Excel para los datos de la factura. Las órdenes
coinciden primero por recibo, después por fecha/importe y por número, sin
confundir el ordinal del contrato con el del recibo. Los cobros agrupados ya
confirmados se conservan; las diferencias con importes cobrados requieren
revisión. Las remesas existentes se mantienen y no se generan nuevas a partir
de los PDF. Los abonos enlazan su factura de origen sin inventar devoluciones.

Los servicios de la factura conservan sus cantidades y precios impresos.
Se enlazan con líneas del contrato solo cuando publicación y medio permiten
una coincidencia única; no se reasignan contenidos de producción ni tarifas.
El IBAN de un recibo identifica la cuenta del cliente, no el banco receptor
de la remesa. El banco de recibos se toma de la instrucción del usuario.

Los originales se conservan en `administracion_facturas_documentos`, con hash
y unicidad por factura. La ficha muestra enlaces privados a esos PDF. No se
requiere S3 para este almacenamiento. Prueba:
`node --experimental-default-type=module scripts/test-publicidad-pdfs.mjs`.

# Facturas abono

La revisión confirmada de saldos se ejecuta con
`scripts/resolve-publicidad-balances.mjs <carpeta> [--apply]`. Sin `--apply`
muestra el saldo de los casos revisados. Conserva los cobros históricos y las
aplicaciones bancarias, ajusta el último vencimiento pendiente al saldo real
o crea una orden por la diferencia con su cobro de contrato y recibo cuando
corresponde. No inventa movimientos bancarios ni remesas. Registra los excesos
cobrados y guarda copia previa; repetir la aplicación no crea duplicados.

El botón Crear factura abono reutiliza el formulario de rectificativas y admite
facturas numeradas importadas. El borrador copia servicios con importes negativos,
conserva la factura original y requiere fecha y prefijo `A`. La emisión fiscal
mantiene el tipo rectificativo R1–R5 por diferencias y una serie separada.
La aplicación operativa no genera una emisión VERI*FACTU ni una devolución bancaria.

`POST /api/v1/admin/facturas-clientes/{id}/abono` aplica el saldo una sola vez.
Los abonos acumulados no pueden superar la factura original. Las órdenes no
cobradas se ajustan al saldo restante o se conservan canceladas, sin fechas de
pago y con referencia al abono. Los cobros anteriores se conservan. Un eventual
exceso cobrado queda identificado como devolución pendiente, sin ejecutarla.
Los recibos remesados y los cobros parciales conciliados bloquean cambios
automáticos. Abonos aplicados y facturas de origen quedan protegidos frente
a cambios de importes y eliminación; los comentarios internos siguen disponibles.
Prueba: `node --experimental-default-type=module scripts/test-credit-notes.mjs`.

# Propuestas desde contratos

`POST /api/v1/comercial/contratos/{id}/propuesta` requiere un agente autenticado
con rol Comercial o superior. La identidad se toma de las cabeceras verificadas
por el middleware. Se crea un borrador con identificadores nuevos, servicios y
condiciones del contrato, fecha actual en Madrid, validez de 30 días y cobros
trasladados conservando los intervalos. El contrato y sus cobros se conservan.
