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

# Propuestas desde contratos

`POST /api/v1/comercial/contratos/{id}/propuesta` requiere un agente autenticado
con rol Comercial o superior. La identidad se toma de las cabeceras verificadas
por el middleware. Se crea un borrador con identificadores nuevos, servicios y
condiciones del contrato, fecha actual en Madrid, validez de 30 días y cobros
trasladados conservando los intervalos. El contrato y sus cobros se conservan.
