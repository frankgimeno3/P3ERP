import {randomUUID} from 'node:crypto';
import {getPgPool} from '../../database/pgClient.js';
import {lockIncome,ensureOrderReceipt,syncInvoiceCollection} from '../prevision/IncomeReconciliation.js';
import {parseImportDate} from '../prevision/ReceiptExcel.js';
import {orderActivity} from '../comentario/AccountActivity.js';

const cents=value=>Math.round(Number(value)*100);
export async function replaceContractOrders(idContrato,selectedIds,newOrders,actorId=''){
  if(!Array.isArray(selectedIds)||!selectedIds.length||new Set(selectedIds).size!==selectedIds.length)throw new Error('Selecciona una o varias órdenes pendientes.');
  if(!Array.isArray(newOrders)||!newOrders.length)throw new Error('Añade al menos una orden nueva.');
  const db=await getPgPool().connect();
  try{
    await db.query('BEGIN');await lockIncome(db);
    const old=(await db.query('SELECT * FROM tesoreria_ordenes WHERE id_contrato=$1 AND id_orden=ANY($2::text[]) ORDER BY id_orden FOR UPDATE',[idContrato,selectedIds])).rows;
    if(old.length!==selectedIds.length)throw new Error('Alguna orden no pertenece al contrato.');
    if(old.some(o=>o.cancelada||o.cobrada||o.fecha_real_cobro||o.cobro_revision_bancaria))throw new Error('Solo se pueden reemplazar órdenes pendientes y sin cobro revisado.');
    const invoiceIds=[...new Set(old.map(o=>o.id_factura||''))];
    if(invoiceIds.length>1)throw new Error('Las órdenes seleccionadas deben pertenecer a la misma factura.');
    if(invoiceIds[0]){const f=(await db.query('SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente=$1 FOR UPDATE',[invoiceIds[0]])).rows[0];if(!f||f.ya_contabilizada||f.verifactu_estado_envio==='factura emitida'||f.estado==='enviada')throw new Error('La factura de estas órdenes ya está cerrada.');}
    for(const o of old){
      if((await db.query('SELECT 1 FROM tesoreria_recibos_importados WHERE id_orden=$1 AND id_remesa IS NOT NULL LIMIT 1',[o.id_orden])).rowCount)throw new Error('Retira primero los recibos de la remesa.');
      if((await db.query(`SELECT 1 FROM tesoreria_movimientos_bancarios b WHERE b.id_orden=$1 OR EXISTS(SELECT 1 FROM tesoreria_aplicaciones_cobro a WHERE a.id_linea_banco=b.id_linea_banco AND a.id_orden=$1) LIMIT 1`,[o.id_orden])).rowCount)throw new Error('La orden tiene movimientos bancarios asociados.');
    }
    const totalOld=old.reduce((s,o)=>s+cents(o.cobro_total),0),baseOld=old.reduce((s,o)=>s+cents(o.base_imponible),0);
    const values=newOrders.map(o=>({total:cents(o.importe),date:parseImportDate(o.fecha),method:String(o.forma_cobro||'').trim(),bank:String(o.banco_cobro||'').trim()}));
    if(values.some(v=>!Number.isSafeInteger(v.total)||v.total<=0||!/^\d{2}\/\d{2}\/\d{4}$/.test(v.date)||!v.method||!v.bank))throw new Error('Completa importes, fechas, forma de cobro y banco de todas las órdenes.');
    if(values.reduce((s,v)=>s+v.total,0)!==totalOld)throw new Error('Las órdenes nuevas deben sumar exactamente el importe de las seleccionadas.');
    const contract=(await db.query('SELECT id_cuenta_contrato FROM comercial_contratos WHERE id_contrato=$1 FOR UPDATE',[idContrato])).rows[0];if(!contract)throw new Error('El contrato no existe.');
    const max=(await db.query(`SELECT GREATEST(COALESCE((SELECT MAX(numero_cobro) FROM tesoreria_ordenes WHERE id_contrato=$1),0),COALESCE((SELECT MAX(numero_cobro) FROM comercial_contratos_cobros WHERE id_contrato=$1),0)) AS n`,[idContrato])).rows[0].n;
    for(const o of old){
      await orderActivity(db,o.id_orden,actorId,'ha reemplazado la orden pendiente por nuevas órdenes de cobro.');
      await db.query('DELETE FROM tesoreria_recibos_importados WHERE id_orden=$1',[o.id_orden]);
      await db.query('UPDATE tesoreria_ordenes SET cancelada=TRUE,cancelada_at=NOW(),cancelada_por=$2,cancelacion_detalle=$3::jsonb,id_cobro_contrato=NULL,updated_at=NOW() WHERE id_orden=$1',[o.id_orden,actorId,JSON.stringify({motivo:'reemplazo',importe_original:o.cobro_total})]);
      if(o.id_cobro_contrato)await db.query('DELETE FROM comercial_contratos_cobros WHERE id_cobro_contrato=$1',[o.id_cobro_contrato]);
    }
    const created=[];let allocated=0;
    for(let i=0;i<values.length;i++){
      const v=values[i],number=Number(max)+i+1,paymentId='cc_'+randomUUID().replaceAll('-','').slice(0,24),orderId='ord_'+randomUUID().replaceAll('-','').slice(0,24);
      const base=i===values.length-1?baseOld-allocated:Math.round(baseOld*v.total/totalOld);allocated+=base;
      await db.query(`INSERT INTO comercial_contratos_cobros(id_cobro_contrato,id_contrato,numero_cobro,fecha_cobro,importe_cobro,forma_cobro,banco_cobro)
        VALUES($1,$2,$3,$4,$5,$6,$7)`,[paymentId,idContrato,number,v.date,v.total/100,v.method,v.bank]);
      await db.query(`INSERT INTO tesoreria_ordenes(id_orden,id_contrato,id_factura,id_cuenta,id_cobro_contrato,numero_cobro,etiqueta_cobro,fecha_teorica_cobro,forma_cobro,banco_cobro,base_imponible,cobro_total,cobrada,cancelada)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,false,false)`,[orderId,idContrato,invoiceIds[0]||null,contract.id_cuenta_contrato,paymentId,number,'Cobro '+number,v.date,v.method,v.bank,base/100,v.total/100]);
      await ensureOrderReceipt(db,orderId,actorId);created.push(orderId);
    }
    if(invoiceIds[0])await syncInvoiceCollection(db,[invoiceIds[0]]);
    await db.query('COMMIT');return {canceladas:selectedIds,creadas:created};
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
