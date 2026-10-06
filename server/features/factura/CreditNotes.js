import {getPgPool} from '../../database/pgClient.js';
import {incomeCents,lockIncome,syncInvoiceCollection,ensureOrderReceipt} from '../prevision/IncomeReconciliation.js';
import {accountActivity,orderActivity} from '../comentario/AccountActivity.js';

export function planCreditOrders(originalTotal,creditTotal,orders){
  const net=incomeCents(originalTotal)-incomeCents(creditTotal);
  if(net<0)throw new Error('Los abonos superan el importe de la factura de origen.');
  const protectedOrders=orders.filter(order=>!order.cancelada&&(order.cobrada||order.has_applications));
  if(protectedOrders.some(order=>!order.cobrada))throw new Error('Hay cobros parciales conciliados: revisa esas órdenes antes de aplicar el abono.');
  const collected=protectedOrders.reduce((sum,order)=>sum+incomeCents(order.cobro_total),0);
  let remaining=Math.max(0,net-collected);
  const changes=[];
  for(const order of orders.filter(order=>!order.cancelada&&!protectedOrders.includes(order))){
    const next=Math.min(remaining,incomeCents(order.cobro_total));remaining-=next;
    if(next===incomeCents(order.cobro_total)&&next>0)continue;
    if(order.id_remesa)throw new Error('Retira primero de su remesa el recibo de la orden '+order.id_orden+'.');
    changes.push({order,cancel:next===0,total:next/100});
  }
  if(remaining>0)throw new Error('Faltan órdenes para el saldo restante de la factura.');
  return {changes,net:net/100,collected:collected/100,refundPending:Math.max(0,collected-net)/100};
}

// Caller holds the income lock; no collection or refund is inferred from a credit note.
export async function applyCreditNote(db,invoiceId,actorId='',beforeApply){
  const credit=(await db.query('SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente=$1 FOR UPDATE',[invoiceId])).rows[0];
  if(!credit||credit.factura_tipo!=='abono'||!credit.factura_origen_id||Number(credit.importe_total)>=0)throw new Error('Selecciona una factura abono negativa y su factura de origen.');
  if(credit.datos_importacion?.abono_aplicado)return {alreadyApplied:true};
  if(!/^A/i.test(credit.numero_factura||'')||!credit.fecha_emision)throw new Error('Indica fecha y número de abono con prefijo A; los borradores no cancelan órdenes.');
  if((await db.query('SELECT 1 FROM administracion_facturas_clientes WHERE numero_factura=$1 AND id_factura_cliente<>$2',[credit.numero_factura,invoiceId])).rowCount)throw new Error('El número del abono ya existe.');
  const original=(await db.query('SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente=$1 FOR UPDATE',[credit.factura_origen_id])).rows[0];
  if(!original||original.factura_tipo==='abono'||original.id_cuenta!==credit.id_cuenta||original.moneda!==credit.moneda)throw new Error('La factura de origen, cliente y moneda deben coincidir.');
  const prior=(await db.query("SELECT COALESCE(sum(-importe_total),0) total FROM administracion_facturas_clientes WHERE factura_origen_id=$1 AND factura_tipo='abono' AND datos_importacion->'abono_aplicado' IS NOT NULL",[original.id_factura_cliente])).rows[0];
  const orders=(await db.query(`SELECT o.*,EXISTS(SELECT 1 FROM tesoreria_aplicaciones_cobro a WHERE a.id_orden=o.id_orden) has_applications,
    r.id_remesa FROM tesoreria_ordenes o LEFT JOIN tesoreria_recibos_importados r USING(id_orden)
    WHERE o.id_factura=$1 ORDER BY numero_cobro,id_orden FOR UPDATE OF o`,[original.id_factura_cliente])).rows;
  const plan=planCreditOrders(original.importe_total,Number(prior.total)-Number(credit.importe_total),orders);
  if(beforeApply)await beforeApply({credit,original,orders,plan});
  for(const change of plan.changes){
    const {order}=change,detail={motivo:'Abonada mediante '+credit.numero_factura,id_factura_abono:invoiceId,numero_abono:credit.numero_factura};
    if(change.cancel){
      await db.query(`UPDATE tesoreria_ordenes SET cancelada=true,cancelada_at=now(),cancelada_por=NULLIF($2,''),cancelacion_detalle=$3::jsonb,
        fecha_teorica_cobro=NULL,fecha_real_cobro=NULL,updated_at=now() WHERE id_orden=$1`,[order.id_orden,actorId,JSON.stringify(detail)]);
      if(order.id_cobro_contrato)await db.query("UPDATE comercial_contratos_cobros SET fecha_cobro='',observaciones_cobro=concat_ws(E'\\n',NULLIF(observaciones_cobro,''),$2),updated_at=now() WHERE id_cobro_contrato=$1",[order.id_cobro_contrato,detail.motivo]);
    }else{
      const base=Math.round(change.total*Number(order.base_imponible)/Number(order.cobro_total)*100)/100;
      await db.query('UPDATE tesoreria_ordenes SET cobro_total=$2,base_imponible=$3,updated_at=now() WHERE id_orden=$1',[order.id_orden,change.total,base]);
      if(order.id_cobro_contrato)await db.query('UPDATE comercial_contratos_cobros SET importe_cobro=$2,updated_at=now() WHERE id_cobro_contrato=$1',[order.id_cobro_contrato,change.total]);
      await ensureOrderReceipt(db,order.id_orden,actorId);
    }
    await orderActivity(db,order.id_orden,actorId,change.cancel?detail.motivo+'; orden conservada sin fecha de pago.':'ha ajustado el saldo pendiente por '+credit.numero_factura+'.');
  }
  const applied={fecha:new Date().toISOString(),factura_origen_id:original.id_factura_cliente,numero_origen:original.numero_factura,...plan};
  delete applied.changes;
  await db.query("UPDATE administracion_facturas_clientes SET datos_importacion=jsonb_set(jsonb_set(COALESCE(datos_importacion,'{}'::jsonb),'{abono_aplicado}',$2::jsonb),'{sin_cobro_monetario}','true'::jsonb),forma_cobro='abono',fecha_vencimiento=NULL,updated_at=now() WHERE id_factura_cliente=$1",[invoiceId,JSON.stringify(applied)]);
  await db.query("UPDATE administracion_facturas_clientes SET datos_importacion=jsonb_set(COALESCE(datos_importacion,'{}'::jsonb),'{saldo_tras_abonos}',$2::jsonb),updated_at=now() WHERE id_factura_cliente=$1",[original.id_factura_cliente,JSON.stringify({...applied,total_abonado:Number(prior.total)-Number(credit.importe_total)})]);
  await db.query(`UPDATE administracion_facturas_clientes SET datos_importacion=jsonb_set(datos_importacion,'{publicidad_pdf,pendiente_revision}','""'::jsonb)
    WHERE id_factura_cliente=ANY($1::text[]) AND datos_importacion ? 'publicidad_pdf'`,[[invoiceId,original.id_factura_cliente]]);
  await db.query(`UPDATE administracion_facturas_clientes SET datos_importacion=jsonb_set(datos_importacion,'{registro_facturas,discrepancia_ordenes}','null'::jsonb)
    WHERE id_factura_cliente=ANY($1::text[]) AND datos_importacion ? 'registro_facturas'`,[[invoiceId,original.id_factura_cliente]]);
  await syncInvoiceCollection(db,[original.id_factura_cliente]);
  await accountActivity(db,original.id_cuenta,actorId,'ha aplicado la factura abono '+credit.numero_factura+' a '+original.numero_factura+'.');
  return applied;
}

export async function applyCustomerCreditNote(invoiceId,actorId='',beforeApply){
  const db=await getPgPool().connect();
  try{await db.query('BEGIN');await lockIncome(db);const result=await applyCreditNote(db,invoiceId,actorId,beforeApply);await db.query('COMMIT');return result;}
  catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
