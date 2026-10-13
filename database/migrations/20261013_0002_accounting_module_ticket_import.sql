BEGIN;
ALTER TABLE mediateca_archivos ALTER COLUMN mediateca_s3_key DROP NOT NULL;
UPDATE agentes_roles SET descripcion_rol='Acceso a Comercial, Administración y Contabilidad. Sin acceso a Dirección, Operaciones ni Producción.',
 permisos_rol='["/dashboard","/dashboard/comercial","/dashboard/administracion","/dashboard/contabilidad","/dashboard/mediateca","/tareas"]'::jsonb,updated_at=now() WHERE id_rol='contabilidad';
UPDATE agentes_roles SET permisos_rol=permisos_rol || '["/dashboard/contabilidad"]'::jsonb,updated_at=now() WHERE id_rol IN ('direccion','superadmin') AND NOT permisos_rol @> '["/dashboard/contabilidad"]'::jsonb;
UPDATE mediateca_carpetas SET access_path=replace(access_path,'/dashboard/direccion/tesoreria','/dashboard/contabilidad') WHERE access_path LIKE '/dashboard/direccion/tesoreria%';
INSERT INTO mediateca_carpetas(mediateca_folder_id,mediateca_folder_name,access_path)
 SELECT gen_random_uuid(),'documentos_contabilidad','/dashboard/contabilidad'
 WHERE NOT EXISTS(SELECT 1 FROM mediateca_carpetas WHERE mediateca_parent_folder_id IS NULL AND mediateca_folder_name='documentos_contabilidad');
ALTER TABLE administracion_tickets ADD COLUMN IF NOT EXISTS codigo_ticket TEXT,
 ADD COLUMN IF NOT EXISTS datos_importacion JSONB,
 ADD COLUMN IF NOT EXISTS feria TEXT NOT NULL DEFAULT '',
 ADD COLUMN IF NOT EXISTS id_archivo_mediateca UUID REFERENCES mediateca_archivos(mediateca_content_id) ON DELETE RESTRICT;
ALTER TABLE administracion_tickets ALTER COLUMN importe_total DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tickets_codigo_unico ON administracion_tickets(codigo_ticket) WHERE codigo_ticket IS NOT NULL;
ALTER TABLE administracion_tickets DROP CONSTRAINT IF EXISTS ticket_importe_pendiente_divisa;
ALTER TABLE administracion_tickets ADD CONSTRAINT ticket_importe_pendiente_divisa CHECK(importe_total IS NOT NULL OR (datos_importacion IS NOT NULL AND COALESCE(datos_importacion->>'moneda' IN ('USD','MXN'),false)));
COMMENT ON COLUMN administracion_tickets.codigo_ticket IS 'Código visible del ticket: V.AA.NNNN para tarjeta y E.AA.NNNN para efectivo; conserva el código original del Excel.';
COMMENT ON COLUMN administracion_tickets.datos_importacion IS 'Origen trazable: libro, hoja, fila, huella, valores originales, moneda e importe original y archivo asociado. No implica revisión completada.';
COMMENT ON COLUMN administracion_tickets.feria IS 'Feria o evento indicado en el origen, sin crear una asociación a una edición ambigua.';
COMMENT ON COLUMN administracion_tickets.id_archivo_mediateca IS 'Justificante compartido con Mediateca; se almacena una sola vez en S3 o en el almacenamiento existente de tickets de RDS y conserva los permisos de su carpeta.';
COMMIT;
