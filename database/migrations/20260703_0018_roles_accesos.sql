BEGIN;

ALTER TABLE roles_db
  ADD COLUMN IF NOT EXISTS descripcion_rol text NOT NULL DEFAULT '';

ALTER TABLE roles_db
  ADD COLUMN IF NOT EXISTS permisos_rol jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE roles_db
  ADD COLUMN IF NOT EXISTS accesos_personalizados boolean NOT NULL DEFAULT false;

ALTER TABLE roles_db
  ADD COLUMN IF NOT EXISTS array_accesos_adicionales jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE agentes_db
  ADD COLUMN IF NOT EXISTS accesos_personalizados boolean NOT NULL DEFAULT false;

ALTER TABLE agentes_db
  ADD COLUMN IF NOT EXISTS array_accesos_adicionales jsonb NOT NULL DEFAULT '[]'::jsonb;

WITH role_permissions AS (
  SELECT *
  FROM (VALUES
    (
      'empleado',
      'Puede visualizar los mÃ³dulos Comercial y ProducciÃ³n.',
      ARRAY[
        '/dashboard',
        '/dashboard/comercial/contactos',
        '/dashboard/comercial/contactos/crear',
        '/dashboard/comercial/contactos/[id]',
        '/dashboard/comercial/contratos',
        '/dashboard/comercial/contratos/[id]',
        '/dashboard/comercial/cuentas',
        '/dashboard/comercial/cuentas/crear',
        '/dashboard/comercial/cuentas/[id_cuenta]',
        '/dashboard/comercial/documentacion',
        '/dashboard/comercial/documentacion/editor/[tipo]/[idioma]',
        '/dashboard/comercial/propuestas',
        '/dashboard/comercial/propuestas/crear',
        '/dashboard/comercial/propuestas/plantillas',
        '/dashboard/comercial/propuestas/cuentas/[id_cuenta]',
        '/dashboard/comercial/propuestas/[id_propuesta]',
        '/dashboard/comercial/propuestas/[id_propuesta]/editar',
        '/dashboard/produccion/contenidos',
        '/dashboard/produccion/contenidos/agregar',
        '/dashboard/produccion/contenidos/[id_contenido]',
        '/dashboard/produccion/hoja_produccion',
        '/dashboard/produccion/hoja_produccion/crear',
        '/dashboard/produccion/hoja_produccion/[id]',
        '/dashboard/produccion/hoja_produccion/[id]/[idMaterial]',
        '/dashboard/produccion/publicaciones',
        '/dashboard/produccion/servicios',
        '/dashboard/produccion/servicios/crear',
        '/dashboard/produccion/servicios/editor_tarifas',
        '/dashboard/produccion/servicios/[id]'
      ]::text[]
    ),
    (
      'administracion',
      'Puede visualizar Comercial, ProducciÃ³n y AdministraciÃ³n.',
      ARRAY[
        '/dashboard',
        '/dashboard/comercial/contactos',
        '/dashboard/comercial/contactos/crear',
        '/dashboard/comercial/contactos/[id]',
        '/dashboard/comercial/contratos',
        '/dashboard/comercial/contratos/[id]',
        '/dashboard/comercial/cuentas',
        '/dashboard/comercial/cuentas/crear',
        '/dashboard/comercial/cuentas/[id_cuenta]',
        '/dashboard/comercial/documentacion',
        '/dashboard/comercial/documentacion/editor/[tipo]/[idioma]',
        '/dashboard/comercial/propuestas',
        '/dashboard/comercial/propuestas/crear',
        '/dashboard/comercial/propuestas/plantillas',
        '/dashboard/comercial/propuestas/cuentas/[id_cuenta]',
        '/dashboard/comercial/propuestas/[id_propuesta]',
        '/dashboard/comercial/propuestas/[id_propuesta]/editar',
        '/dashboard/produccion/contenidos',
        '/dashboard/produccion/contenidos/agregar',
        '/dashboard/produccion/contenidos/[id_contenido]',
        '/dashboard/produccion/hoja_produccion',
        '/dashboard/produccion/hoja_produccion/crear',
        '/dashboard/produccion/hoja_produccion/[id]',
        '/dashboard/produccion/hoja_produccion/[id]/[idMaterial]',
        '/dashboard/produccion/publicaciones',
        '/dashboard/produccion/servicios',
        '/dashboard/produccion/servicios/crear',
        '/dashboard/produccion/servicios/editor_tarifas',
        '/dashboard/produccion/servicios/[id]',
        '/dashboard/administracion/control-administrativo',
        '/dashboard/administracion/facturas-clientes',
        '/dashboard/administracion/facturas-proveedores',
        '/dashboard/administracion/ferias',
        '/dashboard/administracion/ferias/[id_feria]',
        '/dashboard/administracion/pendiente-cobro',
        '/dashboard/administracion/proveedores',
        '/dashboard/administracion/suscripciones',
        '/dashboard/administracion/tareas-montse'
      ]::text[]
    ),
    (
      'operaciones',
      'Puede visualizar Comercial, ProducciÃ³n, AdministraciÃ³n y Operaciones. Puede modificar todos los roles salvo Superadmin.',
      ARRAY[
        '/dashboard',
        '/dashboard/comercial/contactos',
        '/dashboard/comercial/contactos/crear',
        '/dashboard/comercial/contactos/[id]',
        '/dashboard/comercial/contratos',
        '/dashboard/comercial/contratos/[id]',
        '/dashboard/comercial/cuentas',
        '/dashboard/comercial/cuentas/crear',
        '/dashboard/comercial/cuentas/[id_cuenta]',
        '/dashboard/comercial/documentacion',
        '/dashboard/comercial/documentacion/editor/[tipo]/[idioma]',
        '/dashboard/comercial/propuestas',
        '/dashboard/comercial/propuestas/crear',
        '/dashboard/comercial/propuestas/plantillas',
        '/dashboard/comercial/propuestas/cuentas/[id_cuenta]',
        '/dashboard/comercial/propuestas/[id_propuesta]',
        '/dashboard/comercial/propuestas/[id_propuesta]/editar',
        '/dashboard/produccion/contenidos',
        '/dashboard/produccion/contenidos/agregar',
        '/dashboard/produccion/contenidos/[id_contenido]',
        '/dashboard/produccion/hoja_produccion',
        '/dashboard/produccion/hoja_produccion/crear',
        '/dashboard/produccion/hoja_produccion/[id]',
        '/dashboard/produccion/hoja_produccion/[id]/[idMaterial]',
        '/dashboard/produccion/publicaciones',
        '/dashboard/produccion/servicios',
        '/dashboard/produccion/servicios/crear',
        '/dashboard/produccion/servicios/editor_tarifas',
        '/dashboard/produccion/servicios/[id]',
        '/dashboard/administracion/control-administrativo',
        '/dashboard/administracion/facturas-clientes',
        '/dashboard/administracion/facturas-proveedores',
        '/dashboard/administracion/ferias',
        '/dashboard/administracion/ferias/[id_feria]',
        '/dashboard/administracion/pendiente-cobro',
        '/dashboard/administracion/proveedores',
        '/dashboard/administracion/suscripciones',
        '/dashboard/administracion/tareas-montse',
        '/dashboard/operaciones/data',
        '/dashboard/operaciones/data/exportar/contactos',
        '/dashboard/operaciones/data/exportar/cuentas',
        '/dashboard/operaciones/data/importar/contactos',
        '/dashboard/operaciones/data/importar/cuentas',
        '/dashboard/operaciones/roles',
        '/dashboard/operaciones/usuariosyroles'
      ]::text[]
    ),
    (
      'superadmin',
      'Puede visualizar todos los mÃ³dulos y modificar todos los roles.',
      ARRAY[
        '/dashboard',
        '/dashboard/comercial/contactos',
        '/dashboard/comercial/contactos/crear',
        '/dashboard/comercial/contactos/[id]',
        '/dashboard/comercial/contratos',
        '/dashboard/comercial/contratos/[id]',
        '/dashboard/comercial/cuentas',
        '/dashboard/comercial/cuentas/crear',
        '/dashboard/comercial/cuentas/[id_cuenta]',
        '/dashboard/comercial/documentacion',
        '/dashboard/comercial/documentacion/editor/[tipo]/[idioma]',
        '/dashboard/comercial/propuestas',
        '/dashboard/comercial/propuestas/crear',
        '/dashboard/comercial/propuestas/plantillas',
        '/dashboard/comercial/propuestas/cuentas/[id_cuenta]',
        '/dashboard/comercial/propuestas/[id_propuesta]',
        '/dashboard/comercial/propuestas/[id_propuesta]/editar',
        '/dashboard/produccion/contenidos',
        '/dashboard/produccion/contenidos/agregar',
        '/dashboard/produccion/contenidos/[id_contenido]',
        '/dashboard/produccion/hoja_produccion',
        '/dashboard/produccion/hoja_produccion/crear',
        '/dashboard/produccion/hoja_produccion/[id]',
        '/dashboard/produccion/hoja_produccion/[id]/[idMaterial]',
        '/dashboard/produccion/publicaciones',
        '/dashboard/produccion/servicios',
        '/dashboard/produccion/servicios/crear',
        '/dashboard/produccion/servicios/editor_tarifas',
        '/dashboard/produccion/servicios/[id]',
        '/dashboard/administracion/control-administrativo',
        '/dashboard/administracion/facturas-clientes',
        '/dashboard/administracion/facturas-proveedores',
        '/dashboard/administracion/ferias',
        '/dashboard/administracion/ferias/[id_feria]',
        '/dashboard/administracion/pendiente-cobro',
        '/dashboard/administracion/proveedores',
        '/dashboard/administracion/suscripciones',
        '/dashboard/administracion/tareas-montse',
        '/dashboard/operaciones/data',
        '/dashboard/operaciones/data/exportar/contactos',
        '/dashboard/operaciones/data/exportar/cuentas',
        '/dashboard/operaciones/data/importar/contactos',
        '/dashboard/operaciones/data/importar/cuentas',
        '/dashboard/operaciones/roles',
        '/dashboard/operaciones/usuariosyroles',
        '/dashboard/direccion/bancos',
        '/dashboard/direccion/previsiones/prevision-gastos',
        '/dashboard/direccion/previsiones/prevision-ingresos',
        '/dashboard/direccion/previsiones/prevision-ingresos/prevision-recibos',
        '/dashboard/direccion/previsiones/prevision-ingresos/prevision-transfers',
        '/dashboard/direccion/previsiones/prevision-liquidez',
        '/dashboard/direccion/tareas'
      ]::text[]
    )
  ) AS values(id_rol, descripcion_rol, permisos)
)
INSERT INTO roles_db (id_rol, nombre_rol, descripcion_rol, permisos_rol, estado_rol)
SELECT id_rol, id_rol, descripcion_rol, to_jsonb(permisos), 'activo'
FROM role_permissions
ON CONFLICT (id_rol) DO UPDATE
SET nombre_rol = EXCLUDED.nombre_rol,
    descripcion_rol = EXCLUDED.descripcion_rol,
    permisos_rol = EXCLUDED.permisos_rol,
    accesos_personalizados = false,
    array_accesos_adicionales = '[]'::jsonb,
    estado_rol = EXCLUDED.estado_rol,
    updated_at = now();

UPDATE agentes_db
SET accesos_personalizados = false,
    array_accesos_adicionales = '[]'::jsonb,
    updated_at = now()
WHERE accesos_personalizados IS NULL
   OR array_accesos_adicionales IS NULL;

COMMIT;
