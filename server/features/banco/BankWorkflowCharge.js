import { insertRecurringCharge, validateRecurringCharge } from '../prevision/RecurringChargeRepository.js';
import { withRuleIds } from './BankReviewAnalysis.js';
import { cents, fail } from './BankWorkflowValidation.js';

export async function resolveWorkflowCharge(db, body, line, item, created, unassigned, field) {
  let charge = null;
  if (item.newCharge) {
    const key = JSON.stringify([item.entityType,item.entityId,item.newCharge]);
    charge = created.get(key);
    if (!charge) { charge = await insertRecurringCharge(db, { ...item.newCharge, tipo_cargo: item.entityType, id_proveedor: item.entityType === 'proveedor' ? item.entityId : null, id_agente: item.entityType === 'nomina' ? item.entityId : null }); created.set(key, charge); }
  } else if (item.chargeId) {
    charge = (await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1 AND activo=TRUE FOR UPDATE', [item.chargeId])).rows[0];
    if(charge?.id_tarjeta)fail('Este cargo se paga mediante tarjeta. Usa Liquidación tarjeta para revisar el movimiento bancario.');
    if (!charge || !unassigned && charge[field] !== item.entityId || (charge.tipo_cargo || 'proveedor') !== item.entityType) fail('El cargo previsto no corresponde al destinatario.');
    const original = created.get(`original:${charge.id_cargo_recurrente}`) || charge.programacion;
    if (JSON.stringify(original) !== JSON.stringify(item.expectedSchedule) && JSON.stringify(withRuleIds({...charge,programacion:original}).programacion) !== JSON.stringify(item.expectedSchedule)) fail('El cargo previsto ha cambiado. Vuelve a comprobarlo.');
    created.set(`original:${charge.id_cargo_recurrente}`,original);
  }
  if (body.mode === 'charge' && !charge && !item.formerEmployee) fail('Selecciona o crea un cargo previsto.');
  if (charge && Number(line.importe) >= 0) fail('Los ingresos no admiten cargos previstos.');
  if (charge && item.entityType === 'proveedor' && item.increase) {
    const amount = Math.abs(Number(line.importe));
    const rule = (created.get(`original:${charge.id_cargo_recurrente}`) || charge.programacion)[Number(item.ruleIndex || 0)];
    if (!rule || cents(amount) <= cents(rule.total_iva)) fail('El movimiento no supera el importe previsto.');
    const schedule = charge.programacion.map(r => ({ ...r, total_iva: amount, base_imponible: Math.round(amount / (item.vat === false ? 1 : 1.21) * 100) / 100 }));
    validateRecurringCharge({ ...charge, programacion: schedule });
    await db.query('UPDATE tesoreria_cargos_recurrentes SET programacion=$1::jsonb,updated_at=NOW() WHERE id_cargo_recurrente=$2', [JSON.stringify(schedule),charge.id_cargo_recurrente]);
    for (const plannedRule of withRuleIds({ ...charge, programacion: schedule }).programacion) {
      await db.query(`UPDATE tesoreria_cargos_vencimientos v SET importe=$3,programacion=$4::jsonb
        WHERE id_cargo_recurrente=$1 AND id_regla=$2
        AND NOT EXISTS(SELECT 1 FROM tesoreria_vencimientos_aplicaciones a WHERE a.id_vencimiento=v.id)`,
      [charge.id_cargo_recurrente, plannedRule.id_regla, plannedRule.total_iva, JSON.stringify({ tipo: charge.tipo_programacion, regla: plannedRule })]);
    }
  }
  return charge;
}
