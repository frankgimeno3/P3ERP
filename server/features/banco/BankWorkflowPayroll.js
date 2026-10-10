import { randomUUID } from 'node:crypto';
import { cents, fail } from './BankWorkflowValidation.js';

export function payrollCalculation(expected, advances, movement, kind, adjustment, increase) {
  const net = cents(expected), paid = cents(advances), amount = cents(movement), extra = cents(adjustment);
  if (![net, paid, amount, extra].every(Number.isFinite) || net <= 0 || paid < 0 || amount <= 0) fail('Revisa los importes de la nómina.');
  if (kind === 'anticipo') {
    if (extra !== amount || paid + amount > net) fail('El anticipo debe coincidir con el movimiento y no superar la nómina pendiente.');
    return { net, paid, amount, additional: 0 };
  }
  if (kind === 'adicional') {
    if (extra <= 0 || net - paid + extra !== amount) fail('El importe adicional debe cuadrar con la nómina prevista menos anticipos y el movimiento.');
    return { net: net + extra, paid, amount, additional: extra };
  }
  if (kind !== 'completa') fail('Selecciona nómina completa, anticipo o nómina con importe adicional.');
  if (net - paid !== amount && !(increase === true && paid === 0 && amount > net)) fail('La nómina prevista menos anticipos no coincide con el movimiento.');
  return { net: increase === true && paid === 0 && amount > net ? amount : net, paid, amount, additional: 0 };
}

export async function saveWorkflowPayroll(db, line, item, charge) {
  if (!item.formerEmployee && (!charge || charge.tipo_cargo !== 'nomina' || charge.id_agente !== item.entityId)) fail('Selecciona la nómina recurrente del empleado.');
  const period = [Number(item.year), Number(item.month)];
  const linkedPayroll = (await db.query('SELECT * FROM laboral_nominas WHERE id_transferencia=$1', [line.id_linea_banco])).rows[0];
  const linkedAdvance = (await db.query('SELECT * FROM laboral_anticipos WHERE id_transferencia=$1', [line.id_linea_banco])).rows[0];
  const linked = linkedPayroll || linkedAdvance;
  if (linked && (linked.id_empleado !== item.entityId || Number(linked.anio) !== period[0] || Number(linked.mes) !== period[1] || (item.payrollKind === 'anticipo') !== Boolean(linkedAdvance))) fail('La transferencia ya está vinculada a otro pago o periodo laboral. Conserva su tipo y periodo.');
  if (!Number.isInteger(period[0]) || period[0] < 2000 || period[0] > 2100 || !Number.isInteger(period[1]) || period[1] < 1 || period[1] > 12) fail('Selecciona un periodo válido.');
  if (item.payrollKind === 'otros') {
    if (linked) fail('Este movimiento ya está registrado como nómina o anticipo; conserva su clasificación.');
    if (item.increase) fail('Otros no modifica la previsión de nómina.');
    await db.query("INSERT INTO laboral_empleados_en_nomina(id,id_empleado) VALUES('nomina_emp_' || md5($1),$1) ON CONFLICT(id_empleado) DO NOTHING",[item.entityId]);
    return {id_agente:item.entityId,id_cargo_recurrente:charge?.id_cargo_recurrente || null,ex_empleado:item.formerEmployee === true,anio:period[0],mes:period[1],decision:'otros',importe_movimiento:Math.abs(Number(line.importe)),fecha_revision:new Date().toISOString()};
  }
  let record = (await db.query('SELECT * FROM laboral_nominas WHERE id_empleado=$1 AND anio=$2 AND mes=$3 FOR UPDATE', [item.entityId, ...period])).rows[0];
  if (item.payrollId && record?.id !== item.payrollId) fail('La nómina seleccionada ha cambiado.');
  if (record?.id_transferencia && record.id_transferencia !== line.id_linea_banco && !linkedAdvance) fail('Esta nómina ya tiene una transferencia.');
  if (record?.estado === 'pagado' && record.id_transferencia !== line.id_linea_banco && !linkedAdvance) fail('La nómina ya está pagada.');
  const advances = (await db.query('SELECT * FROM laboral_anticipos WHERE id_empleado=$1 AND anio=$2 AND mes=$3 FOR UPDATE', [item.entityId, ...period])).rows;
  const paid = advances.filter(a => a.estado === 'pagado' && a.id_transferencia !== line.id_linea_banco).reduce((n, a) => n + cents(a.importe_neto), 0) / 100;
  const rule = item.formerEmployee ? {total_iva:item.expectedPayroll} : charge.programacion[Number(item.ruleIndex || 0)];
  if (!rule) fail('Selecciona una regla de la nómina recurrente.');
  const priorAdditional = linkedPayroll && item.payrollKind === 'adicional' && line.nomina_revision?.decision === 'adicional';
  const expected = priorAdditional ? Number(line.nomina_revision.importe_previsto) : record ? Number(record.importe_neto) : Number(rule.total_iva);
  if (cents(item.expectedPayroll) !== cents(expected) || cents(item.expectedAdvances) !== cents(paid)) fail('La nómina o sus anticipos han cambiado. Vuelve a comprobar los importes.');
  if (item.increase && item.payrollKind === 'completa' && advances.length) fail('La subida desde nómina completa exige que no haya anticipos registrados.');
  const calc = payrollCalculation(expected, paid, Math.abs(Number(line.importe)), item.payrollKind, item.adjustment || 0, item.increase);
  if (!record) {
    record = (await db.query("INSERT INTO laboral_nominas(id,id_empleado,anio,mes,importe_neto) VALUES($1,$2,$3,$4,$5) RETURNING *", [randomUUID(), item.entityId, ...period, expected])).rows[0];
  }
  if (item.payrollKind === 'anticipo') {
    const existing = advances.find(a => a.id_transferencia === line.id_linea_banco);
    if (existing) await db.query("UPDATE laboral_anticipos SET importe_neto=$1,estado='pagado',updated_at=NOW() WHERE id=$2", [calc.amount / 100,existing.id]);
    else {
      const advance = (await db.query("INSERT INTO laboral_anticipos(id,id_empleado,anio,mes,importe_neto,estado,id_transferencia) VALUES($1,$2,$3,$4,$5,'pagado',$6) RETURNING *", [randomUUID(), item.entityId, ...period, calc.amount / 100, line.id_linea_banco])).rows[0];
      advances.push(advance);
    }
    await db.query('UPDATE laboral_nominas SET anticipos=$1,updated_at=NOW() WHERE id=$2', [advances.map(a => a.id), record.id]);
  } else {
    await db.query("UPDATE laboral_nominas SET importe_neto=$1,anticipos=$2,id_transferencia=$3,estado='pagado',updated_at=NOW() WHERE id=$4", [calc.net / 100, advances.map(a => a.id), line.id_linea_banco, record.id]);
    if (item.increase && item.payrollKind === 'completa' && calc.net > cents(expected)) {
      const schedule = charge.programacion.map(r => ({ ...r, total_iva: calc.net / 100, base_imponible: 0 }));
      await db.query('UPDATE tesoreria_cargos_recurrentes SET programacion=$1::jsonb,updated_at=NOW() WHERE id_cargo_recurrente=$2', [JSON.stringify(schedule), charge.id_cargo_recurrente]);
    }
  }
  return { id_nomina: record.id, id_agente: item.entityId, id_cargo_recurrente: charge?.id_cargo_recurrente || null, ex_empleado: item.formerEmployee === true, anio: period[0], mes: period[1], decision: item.payrollKind, importe_previsto: expected, anticipos: paid, importe_movimiento: calc.amount / 100, importe_adicional: calc.additional / 100, fecha_revision: new Date().toISOString() };
}
