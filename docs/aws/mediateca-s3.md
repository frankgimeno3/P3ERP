# Almacenamiento compartido de P3ERP

Mediateca, materiales y versiones acabadas comparten `S3Service.js`. El bucket confirmado es `mediateca-plynium-bucket`, región España `eu-south-2`. Es el valor del proyecto cuando no existe una variable de entorno; `AWS_S3_BUCKET`/`S3_BUCKET` y `AWS_S3_REGION`/`S3_REGION` permiten sobrescribirlo. `IAM_REGION` también es compatible. El bucket del proyecto usa España aunque el proveedor de alojamiento defina AWS_REGION para sus servidores en otra región. Las claves nunca se guardan en Git.

La prueba local de una URL firmada PUT devolvió `403 AccessDenied`. Las credenciales locales identifican al usuario IAM `fichajesp3user`, de la misma cuenta del bucket. Tampoco permiten consultar políticas IAM ni la configuración CORS. No se cambió ninguna política AWS ni se creó un objeto de prueba.

## Permisos de objetos

En IAM > Usuarios > fichajesp3user > Permisos, revisar primero las políticas directas y heredadas de grupos, sus recursos, condiciones y posibles denegaciones. Un permiso sobre `media/*` no cubre `mediateca/*`. El 403 no demuestra por sí solo que no exista una política: puede existir con otro recurso o una restricción. Si falta la autorización, un administrador AWS puede asociar `p3erp-mediateca-objects-policy.json` a la identidad IAM que utilice P3ERP. En local es `fichajesp3user`; en Vercel hay que comprobar si `IAM_ACCESS_KEY_ID`/`IAM_SECRET_ACCESS_KEY` o `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` corresponden a esa identidad o a otra. No enviar claves por chat. La política permite subir, leer, verificar y eliminar únicamente los objetos `mediateca/*`. No permite administrar IAM, listar otros buckets ni leer o cambiar su configuración.

La política mostrada en la captura para CloudFront permite lectura a esa distribución. Se conserva. No sustituye los permisos IAM del servidor para generar URLs de subida autorizadas. El bloqueo de acceso público y las ACL deshabilitadas se conservan.

## CORS

Las pruebas OPTIONS para PUT con Content-Type desde `https://p3-erp.vercel.app` y `http://localhost:3000` respondieron 200, con Allow-Origin `*` y métodos PUT, GET, HEAD. La configuración existente permite esos orígenes y no se ha modificado. CORS no concede permisos IAM.

## Verificación

Comprobar una subida desde la ficha del contenido y una versión acabada. Verificar que se registran el material, autor y fecha y que V01/V02 no se sobrescriben. Los errores S3 no deben registrar archivos inexistentes ni marcar una descarga fallida. Una prueba técnica temporal debe registrar sus cambios con `externalUserEvent` y eliminar después su propio objeto.

Referencias oficiales: [URLs firmadas y permisos](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html), [configuración CORS](https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManageCorsUsing.html).
