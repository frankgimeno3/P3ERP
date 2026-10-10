import { saveWorkflowPayroll } from './BankWorkflowPayroll.js';
import { resolveWorkflowRecipient } from './BankWorkflowRecipient.js';
import { resolveWorkflowCharge } from './BankWorkflowCharge.js';
import { fail } from './BankWorkflowValidation.js';

// All writes use the coordinator's client; no nested transaction or connection.
export async function saveWorkflowExpense(db, body, line, item, created) {
  const { unassigned, field, other } = await resolveWorkflowRecipient(db, body, line, item);
  const charge = await resolveWorkflowCharge(db, body, line, item, created, unassigned, field);
  let snapshot = other || unassigned ? null : line.nomina_revision;
  if (body.mode !== 'review' && item.entityType === 'nomina') snapshot = {...snapshot,ex_empleado:item.formerEmployee === true};
  if (body.mode === 'review' && item.entityType === 'nomina') snapshot = await saveWorkflowPayroll(db, line, item, charge);
  let paymentId = item.paymentId || null;
  if (paymentId && !charge) {
    const payment = (await db.query('SELECT * FROM tesoreria_pagos_previstos WHERE id_pago=$1 FOR SHARE', [paymentId])).rows[0];
    if (!payment || item.entityType !== 'proveedor' || payment.id_proveedor !== item.entityId) fail('El pago previsto no corresponde al proveedor.');
  }
  if (charge) paymentId = null;
  let orderId = item.orderId || null;
  if (item.orderId) {
    const order = (await db.query('SELECT o.*,COALESCE(o.id_cuenta,c.id_cuenta_contrato) AS id_cuenta FROM tesoreria_ordenes o LEFT JOIN comercial_contratos c ON c.id_contrato=o.id_contrato WHERE o.id_orden=$1 FOR SHARE OF o', [item.orderId])).rows[0];
    if (!order || item.entityType !== 'cliente' || order.id_cuenta !== item.entityId) fail('La orden no corresponde al cliente.');
    if(order.cancelada)fail('La orden está cancelada y no admite movimientos bancarios.');
    orderId = item.orderId;
  }
  const comments = body.mode === 'review' && ['proveedor','otro'].includes(item.entityType) && item.commentsEdited === true ? item.comments : null;
  if(comments !== null && (typeof comments !== 'string' || comments.length>30000))fail('Revisa los comentarios del movimiento.');
  return (await db.query('UPDATE tesoreria_movimientos_bancarios SET id_proveedor=$1,id_cuenta=$2,id_agente=$3,id_cargo_recurrente=$4,id_pago=$5,id_orden=$6,estado_revision=$7,nomina_revision=$8::jsonb,comentarios=COALESCE($10,comentarios),updated_at=NOW() WHERE id_linea_banco=$9 RETURNING *', [item.entityType === 'proveedor' ? item.entityId : null,item.entityType === 'cliente' ? item.entityId : null,item.entityType === 'nomina' ? item.entityId : null,charge?.id_cargo_recurrente || null,paymentId,orderId,body.mode === 'review' ? true : other ? false : line.estado_revision,JSON.stringify(snapshot),line.id_linea_banco,comments])).rows[0];
}
