import {createHash} from 'node:crypto';
import {getPgPool} from '../../database/pgClient.js';
import {lockIncome, incomeError, syncInvoiceCollection} from '../prevision/IncomeReconciliation.js';
import {orderActivity} from '../comentario/AccountActivity.js';

async function inspect(db,idOrden) {
  const order=(await db.query('SELECT * FROM tesoreria_ordenes WHERE id_orden=$1 FOR UPDATE',[idOrden])).rows[0];
  if(!order)return null;
  const receipts=(await db.query('SELECT * FROM tesoreria_recibos_importados WHERE id_orden=$1 ORDER BY numero_recibo FOR UPDATE',[idOrden])).rows;
  const invoice=order.id_factura?(await db.query('SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente=$1 FOR UPDATE',[order.id_factura])).rows[0]:null;
  const associations=(await db.query(`SELECT b.id_linea_banco,b.estado_revision FROM tesoreria_movimientos_bancarios b
    WHERE b.id_orden=$1 OR EXISTS(SELECT 1 FROM tesoreria_aplicaciones_cobro a WHERE a.id_linea_banco=b.id_linea_banco AND a.id_orden=$1)
    ORDER BY b.id_linea_banco`,[idOrden])).rows;
  const blockers=[];
  if(order.cancelada)blockers.push('La orden ya está cancelada.');
  if(order.cobrada || associations.some(b=>b.estado_revision))blockers.push('Desmarca primero el cobro o su revisión bancaria antes de cancelar la orden.');
  let invoiceAction='ninguna',lines=[],otherOrders=[];
  if(invoice){
    if(invoice.cobrada || Number(invoice.importe_cobrado)>0)blockers.push('La factura registra cobros. Resuélvelos antes de cancelar la orden.');
    const immutable=(await db.query('SELECT 1 FROM fiscal_verifactu_registros WHERE invoice_id=$1 LIMIT 1',[order.id_factura])).rowCount;
    if(invoice.ya_contabilizada || invoice.verifactu_estado_envio==='factura emitida' || invoice.estado==='enviada' || immutable)
      blockers.push('La factura está emitida o contabilizada. Debe resolverse desde Facturas antes de cancelar esta orden.');
    otherOrders=(await db.query('SELECT id_orden,updated_at FROM tesoreria_ordenes WHERE id_factura=$1 AND id_orden<>$2 ORDER BY id_orden',[order.id_factura,idOrden])).rows;
    const otherReferences=(await db.query(`SELECT 1 FROM comercial_contratos WHERE id_factura=$1 AND id_contrato IS DISTINCT FROM $2
      UNION ALL SELECT 1 FROM administracion_facturas_clientes WHERE factura_origen_id=$1
      UNION ALL SELECT 1 FROM tesoreria_recibos_importados WHERE (numero_factura=$1 OR numero_factura=NULLIF($3,'')) AND id_orden IS DISTINCT FROM $4 LIMIT 1`,[order.id_factura,order.id_contrato,invoice.numero_factura,idOrden])).rowCount;
    invoiceAction=otherOrders.length||otherReferences?'conservar_compartida':'eliminar';
    lines=(await db.query('SELECT * FROM administracion_lineas_factura WHERE id_factura_cliente=$1 ORDER BY posicion',[order.id_factura])).rows;
  }
  const version=createHash('sha256').update(JSON.stringify({order,receipts,invoice,lines,associations,otherOrders,invoiceAction})).digest('hex');
  return {order,receipts,invoice,lines,associations,version,blockers,invoiceAction,otherOrders};
}

function publicPlan(plan){
  return plan && {id_orden:plan.order.id_orden,version:plan.version,bloqueos:plan.blockers,
    recibos:plan.receipts.map(r=>({numero_recibo:r.numero_recibo,id_remesa:r.id_remesa,importe:r.importe_recibo})),
    transferencia_pendiente:/transf/i.test(plan.order.forma_cobro||''),
    factura:plan.invoice?{id:plan.invoice.id_factura_cliente,numero:plan.invoice.numero_factura||plan.invoice.id_factura_cliente,accion:plan.invoiceAction,otras_ordenes:plan.otherOrders.map(o=>o.id_orden)}:null};
}

export async function previewOrderCancellation(idOrden){
  const db=await getPgPool().connect();
  try{await db.query('BEGIN');await lockIncome(db);const plan=await inspect(db,idOrden);await db.query('COMMIT');return publicPlan(plan);}
  catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}

export async function cancelAdministrativeOrder(idOrden,version,actorId=''){
  const db=await getPgPool().connect();
  try{
    await db.query('BEGIN');await lockIncome(db);
    const plan=await inspect(db,idOrden);
    if(!plan){await db.query('COMMIT');return null;}
    if(plan.blockers.length)incomeError(plan.blockers.join(' '));
    if(!version || version!==plan.version)incomeError('La orden o sus documentos han cambiado. Vuelve a revisar la cancelación.');
    const {order,receipts,invoice,invoiceAction}=plan;
    await orderActivity(db,idOrden,actorId,`ha cancelado la orden, conservando su ficha y retirando sus ingresos previstos. Recibos eliminados: ${receipts.map(r=>r.numero_recibo).join(', ')||'ninguno'}. Factura: ${invoiceAction==='eliminar'?'eliminada':invoiceAction==='conservar_compartida'?'conservada por estar compartida':'sin factura'}.`);
    await db.query('DELETE FROM tesoreria_aplicaciones_cobro WHERE id_orden=$1',[idOrden]);
    await db.query("UPDATE tesoreria_movimientos_bancarios SET id_orden=NULL,tipo_ingreso=NULL,updated_at=now() WHERE id_orden=$1 AND NOT COALESCE(estado_revision,false)",[idOrden]);
    await db.query('DELETE FROM tesoreria_recibos_importados WHERE id_orden=$1',[idOrden]);
    // The original proposal is history; remove only this order's contract payment schedule.
    let removedPayment=null;
    if(order.id_cobro_contrato){
      removedPayment=(await db.query(`DELETE FROM comercial_contratos_cobros c WHERE c.id_cobro_contrato=$1
        AND NOT EXISTS(SELECT 1 FROM tesoreria_ordenes o WHERE o.id_cobro_contrato=c.id_cobro_contrato AND o.id_orden<>$2) RETURNING *`,[order.id_cobro_contrato,idOrden])).rows[0]||null;
    }
    const archive={recibos:receipts,cobro_contrato:removedPayment,factura_eliminada:invoiceAction==='eliminar'?{...invoice,lineas:plan.lines}:null,factura_compartida:invoiceAction==='conservar_compartida'?order.id_factura:null};
    if(invoiceAction==='eliminar'){
      await db.query('DELETE FROM administracion_lineas_factura WHERE id_factura_cliente=$1',[order.id_factura]);
      await db.query('UPDATE comercial_contratos SET id_factura=NULL,updated_at=now() WHERE id_factura=$1',[order.id_factura]);
      await db.query('DELETE FROM administracion_facturas_clientes WHERE id_factura_cliente=$1',[order.id_factura]);
    }
    await db.query(`UPDATE tesoreria_ordenes SET cancelada=TRUE,cancelada_at=now(),cancelada_por=$2,
      cancelacion_detalle=$3::jsonb,id_factura=CASE WHEN $4 THEN NULL ELSE id_factura END,
      id_cobro_contrato=CASE WHEN $5 THEN NULL ELSE id_cobro_contrato END,updated_at=now() WHERE id_orden=$1`,
    [idOrden,actorId,JSON.stringify(archive),invoiceAction==='eliminar',Boolean(removedPayment)]);
    if(invoiceAction==='conservar_compartida')await syncInvoiceCollection(db,[order.id_factura]);
    await db.query('COMMIT');return {id_orden:idOrden,cancelada:true};
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
