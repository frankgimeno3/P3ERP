export const isTestIdentifier=value=>String(value||'').startsWith('PRUEBA-');
export const testIdentifier=(value,test=false)=>test||isTestIdentifier(value)?'PRUEBA-'+String(value).replace(/^PRUEBA-+/,''):value;
export async function testMode(db,{requested=false,accountId='',contactId='',proposalId='',contractId='',orderId=''}={}){
 if(typeof requested!=='boolean')throw Object.assign(new Error('Modo prueba debe ser Sí o No.'),{status:400});
 if(requested)return true;
 for(const [table,key,id] of [['comercial_cuentas','id_cuenta',accountId],['comercial_contactos','id_contacto',contactId],['comercial_propuestas_db','id_propuesta',proposalId],['comercial_contratos','id_contrato',contractId],['tesoreria_ordenes','id_orden',orderId]]){
  if(!id)continue;if(isTestIdentifier(id))return true;
  if((await db.query(`SELECT es_prueba FROM ${table} WHERE ${key}=$1`,[id])).rows[0]?.es_prueba)return true;
 }
 return false;
}
