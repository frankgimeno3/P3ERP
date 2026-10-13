import {orderActivity} from '../comentario/AccountActivity.js';
import {incomeCents} from '../prevision/IncomeReconciliation.js';
// An imported invoice placeholder is not a second payment. Only merge it when
// one real contract order describes the exact same invoice/payment and it has
// no receipts, applications or bank links. Preserve its old URL as an alias.
export async function mergeInvoicePlaceholder(db,invoiceId,canonicalIds,actorId=''){
 if(canonicalIds.length!==1)return [];
 const canonical=(await db.query('SELECT * FROM tesoreria_ordenes WHERE id_orden=$1',[canonicalIds[0]])).rows[0];
 if(!canonical?.id_contrato||canonical.id_factura!==invoiceId||canonical.cancelada)return [];
 const rows=(await db.query("SELECT * FROM tesoreria_ordenes WHERE id_factura=$1 AND COALESCE(id_contrato,'')='' AND numero_cobro=1 AND (id_orden LIKE 'ord_fac_reg_%' OR datos_importacion->'registro_facturas' IS NOT NULL) FOR UPDATE",[invoiceId])).rows;
 const removed=[];
 const columns=(await db.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema=current_schema() AND column_name='id_orden' AND table_name<>'tesoreria_ordenes'")).rows;
 for(const row of rows){
  if(row.cobrada||(row.id_cuenta&&canonical.id_cuenta&&row.id_cuenta!==canonical.id_cuenta)||incomeCents(row.cobro_total)!==incomeCents(canonical.cobro_total)||incomeCents(row.base_imponible)!==incomeCents(canonical.base_imponible))continue;
  let associated=false;
  for(const c of columns){const quote=v=>'"'+v.replaceAll('"','""')+'"';if((await db.query(`SELECT 1 FROM ${quote(c.table_name)} WHERE ${quote(c.column_name)}=$1 LIMIT 1`,[row.id_orden])).rowCount){associated=true;break;}}
  if(associated)continue;
  if((await db.query('SELECT 1 FROM administracion_facturas_clientes WHERE id_orden_origen=$1 AND id_factura_cliente<>$2',[row.id_orden,invoiceId])).rowCount)continue;
  await db.query('UPDATE administracion_facturas_clientes SET id_orden_origen=$1 WHERE id_factura_cliente=$2 AND id_orden_origen=$3',[canonical.id_orden,invoiceId,row.id_orden]);
  await db.query('DELETE FROM tesoreria_ordenes WHERE id_orden=$1',[row.id_orden]);
  await db.query("INSERT INTO general_identificadores_alias(entidad,id_anterior,id_actual,motivo) VALUES('orden',$1,$2,'Duplicado de importación: mismo cobro de la misma factura y contrato; sin pagos ni recibos asociados.') ON CONFLICT(entidad,id_anterior) DO UPDATE SET id_actual=EXCLUDED.id_actual,motivo=EXCLUDED.motivo",[row.id_orden,canonical.id_orden]);
  await orderActivity(db,canonical.id_orden,actorId,`ha retirado el duplicado de importación ${row.id_orden}, que representaba el mismo cobro de la factura ${invoiceId}.${row.cancelada?' Ya estaba anulado y sin pagos asociados.':''} Su histórico se conserva en la auditoría y su código anterior remite a esta orden.`);removed.push(row.id_orden);
 }
 return removed;
}
