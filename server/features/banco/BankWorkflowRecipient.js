import { fail } from './BankWorkflowValidation.js';

export async function resolveWorkflowRecipient(db, body, line, item) {
  const unassigned = item.entityType === 'otro';
  if (unassigned && (Number(line.importe) >= 0 || item.entityId || item.paymentId || item.orderId || item.increase || item.formerEmployee)) fail('Otro admite cargos previstos sin proveedor, cliente ni empleado.');
  if (!unassigned && (!['proveedor','cliente','nomina'].includes(item.entityType) || !item.entityId)) fail('Selecciona un destinatario.');
  const field = { proveedor: 'id_proveedor', cliente: 'id_cuenta', nomina: 'id_agente' }[item.entityType];
  const linked = (await db.query("SELECT id_empleado FROM laboral_nominas WHERE id_transferencia=$1 UNION ALL SELECT id_empleado FROM laboral_anticipos WHERE id_transferencia=$1", [line.id_linea_banco])).rows;
  const linkedCharge = line.id_cargo_recurrente ? (await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1 FOR SHARE',[line.id_cargo_recurrente])).rows[0] : null;
  const linkedPayment = line.id_pago ? (await db.query('SELECT * FROM tesoreria_pagos_previstos WHERE id_pago=$1 FOR SHARE',[line.id_pago])).rows[0] : null;
  const owners = [line,linkedCharge,linkedPayment,...linked.map(r=>({id_agente:r.id_empleado}))].filter(Boolean);
  const other = owners.some(owner=>['id_proveedor','id_cuenta','id_agente'].some(k => owner[k] && (k !== field || owner[k] !== item.entityId)));
  if (other && item.resolution !== 'overwrite') fail(`Decide si omites o sobrescribes ${line.id_linea_banco}.`);
  if (unassigned && !item.chargeId && !item.newCharge) {
    if(body.memory?.allocations?.some(plan=>plan.lineId===line.id_linea_banco&&plan.allocations?.length))fail('Selecciona un cargo previsto para asociar vencimientos.');
    await db.query('DELETE FROM tesoreria_vencimientos_aplicaciones WHERE id_linea_banco=$1',[line.id_linea_banco]);
  }
  if ((item.entityType === 'nomina' || body.mode === 'charge') && Number(line.importe) >= 0) fail('Los ingresos no admiten cargos previstos ni nóminas.');
  if (body.mode === 'charge' && (!unassigned && !line.id_proveedor && !line.id_agente || other)) fail('Asigna primero el movimiento a su proveedor o empleado.');
  const table = { proveedor: 'administracion_proveedores', cliente: 'comercial_cuentas', nomina: 'agentes_db' }[item.entityType];
  if (!unassigned && !(await db.query(`SELECT ${field} FROM ${table} WHERE ${field}=$1 ${item.entityType === 'nomina' ? 'AND is_empleado_account=TRUE' : ''} FOR SHARE`, [item.entityId])).rowCount) fail('El destinatario ya no existe.');
  // Release a previous payroll association explicitly, keeping its record and documents.
  if (linked.length && (other || item.entityType !== 'nomina')) {
    if (item.resolution !== 'overwrite') fail('Confirma la sustitución del pago vinculado.');
    await db.query("UPDATE laboral_nominas SET id_transferencia=NULL,estado='pendiente',updated_at=NOW() WHERE id_transferencia=$1", [line.id_linea_banco]);
    await db.query("UPDATE laboral_anticipos SET id_transferencia=NULL,estado='pendiente',updated_at=NOW() WHERE id_transferencia=$1", [line.id_linea_banco]);
  }
  if (item.formerEmployee && (item.entityType !== 'nomina' || item.chargeId || item.newCharge || item.increase)) fail('Un ex-empleado no admite cargo recurrente ni subida de previsión.');
  return { unassigned, field, other };
}
