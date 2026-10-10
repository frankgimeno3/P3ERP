import {getPgPool} from '../../database/pgClient.js';
const entities={
 cuenta:['comercial_cuentas','id_cuenta'],contacto:['comercial_contactos','id_contacto'],
 orden:['tesoreria_ordenes','id_orden'],factura:['administracion_facturas_clientes','id_factura_cliente'],
 agente:['agentes_db','id_agente'],proveedor:['administracion_proveedores','id_proveedor'],
 tarjeta:['tesoreria_tarjetas','id_tarjeta'],contenido:['produccion_contenidos','id_contenido'],
 recibo:['tesoreria_recibos_importados','numero_recibo'],
};
export async function resolveIdentifier(entity,id,db=getPgPool()) {
 const config=entities[entity];if(!config)throw new Error('Entidad de identificador desconocida.');
 if(!id)return id;
 // A currently assigned business code wins over an ambiguous historical URL.
 if((await db.query(`SELECT 1 FROM ${config[0]} WHERE ${config[1]}=$1`,[id])).rowCount)return id;
 if(!(await db.query("SELECT to_regclass('general_identificadores_alias') id")).rows[0].id)return id;
 return (await db.query('SELECT id_actual FROM general_identificadores_alias WHERE entidad=$1 AND id_anterior=$2',[entity,id])).rows[0]?.id_actual || id;
}
