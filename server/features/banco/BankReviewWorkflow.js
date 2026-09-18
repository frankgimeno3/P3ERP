import { randomUUID } from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
import { insertRecurringCharge, RecurringChargeError, validateRecurringCharge } from '../prevision/RecurringChargeRepository.js';
import { lockIncome, reconcileBankIncome, syncOrderCollections } from '../prevision/IncomeReconciliation.js';

const fail = message => { throw new RecurringChargeError(message, 409); };
export const cents = value => Math.round(Number(value) * 100);
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

async function payroll(db, line, item, charge) {
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

export async function saveBankWorkflow(body, actorId = '') {
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids)] : [];
  if (!ids.length) fail('Selecciona movimientos.');
  const db = await getPgPool().connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    await lockIncome(db);
    const lines = (await db.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=ANY($1::text[]) ORDER BY id_linea_banco FOR UPDATE', [ids])).rows;
    if (lines.length !== ids.length) fail('Algún movimiento ya no existe.');
    if (body.action === 'force-review') {
      if(typeof body.forcedComment !== 'string' || !body.forcedComment.trim() || body.forcedComment.length>30000)fail('El comentario de revisión forzada es obligatorio y no puede superar 30000 caracteres.');
      if(lines.some(l=>l.estado_revision))fail('Selecciona solamente movimientos sin revisar.');
      for(const line of lines){const item=body.items?.find(i=>i.id===line.id_linea_banco);if(!item||new Date(item.version).getTime()!==new Date(line.updated_at).getTime())fail('Un movimiento ha cambiado. Recarga la selección.');}
      const result=await db.query("UPDATE tesoreria_movimientos_bancarios SET estado_revision=TRUE,comentarios=concat_ws(E'\\n',NULLIF(comentarios,''),$2::text),updated_at=NOW() WHERE id_linea_banco=ANY($1::text[]) RETURNING *",[ids,body.forcedComment.trim()]);
      const incomeIds=lines.filter(l=>Number(l.importe)>0).map(l=>l.id_linea_banco);
      const linked = incomeIds.length ? (await db.query('SELECT id_orden FROM tesoreria_aplicaciones_cobro WHERE id_linea_banco=ANY($1::text[])', [incomeIds])).rows : [];
      await syncOrderCollections(db,linked.map(row=>row.id_orden),actorId);
      await db.query('COMMIT');return result.rows;
    }
    if (body.action === 'unreview') {
      if (lines.some(l => !l.estado_revision)) fail('Selecciona únicamente registros revisados.');
      const result = await db.query('UPDATE tesoreria_movimientos_bancarios SET estado_revision=FALSE,updated_at=NOW() WHERE id_linea_banco=ANY($1::text[]) RETURNING *', [ids]);
      const incomeIds=lines.filter(l=>Number(l.importe)>0).map(l=>l.id_linea_banco);
      const linked = incomeIds.length ? (await db.query('SELECT id_orden FROM tesoreria_aplicaciones_cobro WHERE id_linea_banco=ANY($1::text[])', [incomeIds])).rows : [];
      await syncOrderCollections(db,linked.map(row=>row.id_orden),actorId);
      await db.query('COMMIT'); return result.rows;
    }
    if (!['review','assign','charge'].includes(body.mode)) fail('Modo de revisión no válido.');
    if (body.mode === 'review' && lines.some(l => l.estado_revision)) fail('No se pueden mezclar registros revisados y sin revisar.');
    if (!Array.isArray(body.items) || body.items.length !== ids.length || new Set(body.items.map(i => i.id)).size !== ids.length) fail('Completa las decisiones de todas las líneas.');
    const increases = new Map();
    for (const item of body.items.filter(i => i.increase && i.resolution !== 'skip')) {
      const key = item.chargeId || JSON.stringify([item.entityType,item.entityId,item.newCharge]);
      const amount = Math.abs(Number(lines.find(l => l.id_linea_banco === item.id)?.importe));
      if (increases.has(key) && cents(increases.get(key)) !== cents(amount)) fail('Has indicado subidas distintas para el mismo cargo previsto. Elige un único importe mensual.');
      increases.set(key,amount);
    }
    const saved = [], created = new Map();
    // Advances must be persisted before the remaining salary for the same batch.
    if (body.mode === 'review') lines.sort((a,b) => {
      const priority = l => body.items.find(i => i.id === l.id_linea_banco)?.payrollKind === 'anticipo' ? 0 : 1;
      return priority(a)-priority(b) || a.id_linea_banco.localeCompare(b.id_linea_banco);
    });
    for (const line of lines) {
      const item = body.items.find(i => i.id === line.id_linea_banco);
      if (!item) fail('Falta la decisión de un movimiento.');
      if (new Date(line.updated_at).getTime() !== new Date(item.version).getTime()) fail(`El registro ${line.id_linea_banco} ha cambiado. Recarga la revisión.`);
      if (item.resolution === 'skip') continue;
      if (Number(line.importe) > 0 && body.mode === 'review') {
        if ((line.id_proveedor || line.id_agente || line.id_cuenta && item.incomeType !== 'remesa' && line.id_cuenta !== item.entityId) && item.resolution !== 'overwrite') fail('Confirma la sustitución del destinatario anterior.');
        saved.push(await reconcileBankIncome(db,line,item,actorId));
        continue;
      }
      if (Number(line.importe) > 0 && line.estado_revision) fail('Desmarca la revisión del ingreso antes de cambiar su asociación.');
      if (!['proveedor','cliente','nomina'].includes(item.entityType) || !item.entityId) fail('Selecciona un destinatario.');
      const field = { proveedor: 'id_proveedor', cliente: 'id_cuenta', nomina: 'id_agente' }[item.entityType];
      const linked = (await db.query("SELECT id_empleado FROM laboral_nominas WHERE id_transferencia=$1 UNION ALL SELECT id_empleado FROM laboral_anticipos WHERE id_transferencia=$1", [line.id_linea_banco])).rows;
      const linkedCharge = line.id_cargo_recurrente ? (await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1 FOR SHARE',[line.id_cargo_recurrente])).rows[0] : null;
      const linkedPayment = line.id_pago ? (await db.query('SELECT * FROM tesoreria_pagos_previstos WHERE id_pago=$1 FOR SHARE',[line.id_pago])).rows[0] : null;
      const owners = [line,linkedCharge,linkedPayment,...linked.map(r=>({id_agente:r.id_empleado}))].filter(Boolean);
      const other = owners.some(owner=>['id_proveedor','id_cuenta','id_agente'].some(k => owner[k] && (k !== field || owner[k] !== item.entityId)));
      if (other && item.resolution !== 'overwrite') fail(`Decide si omites o sobrescribes ${line.id_linea_banco}.`);
      if ((item.entityType === 'nomina' || body.mode === 'charge') && Number(line.importe) >= 0) fail('Los ingresos no admiten cargos previstos ni nóminas.');
      if (body.mode === 'charge' && (!line.id_proveedor && !line.id_agente || other)) fail('Asigna primero el movimiento a su proveedor o empleado.');
      const table = { proveedor: 'administracion_proveedores', cliente: 'comercial_cuentas', nomina: 'agentes_db' }[item.entityType];
      if (!(await db.query(`SELECT ${field} FROM ${table} WHERE ${field}=$1 ${item.entityType === 'nomina' ? 'AND is_empleado_account=TRUE' : ''} FOR SHARE`, [item.entityId])).rowCount) fail('El destinatario ya no existe.');
      // Release a previous payroll association explicitly, keeping its record and documents.
      if (linked.length && (other || item.entityType !== 'nomina')) {
        if (item.resolution !== 'overwrite') fail('Confirma la sustitución del pago vinculado.');
        await db.query("UPDATE laboral_nominas SET id_transferencia=NULL,estado='pendiente',updated_at=NOW() WHERE id_transferencia=$1", [line.id_linea_banco]);
        await db.query("UPDATE laboral_anticipos SET id_transferencia=NULL,estado='pendiente',updated_at=NOW() WHERE id_transferencia=$1", [line.id_linea_banco]);
      }
      if (item.formerEmployee && (item.entityType !== 'nomina' || item.chargeId || item.newCharge || item.increase)) fail('Un ex-empleado no admite cargo recurrente ni subida de previsión.');
      let charge = null;
      if (item.newCharge) {
        const key = JSON.stringify([item.entityType,item.entityId,item.newCharge]);
        charge = created.get(key);
        if (!charge) { charge = await insertRecurringCharge(db, { ...item.newCharge, tipo_cargo: item.entityType, id_proveedor: item.entityType === 'proveedor' ? item.entityId : null, id_agente: item.entityType === 'nomina' ? item.entityId : null }); created.set(key, charge); }
      } else if (item.chargeId) {
        charge = (await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1 AND activo=TRUE FOR UPDATE', [item.chargeId])).rows[0];
        if (!charge || charge[field] !== item.entityId || (charge.tipo_cargo || 'proveedor') !== item.entityType) fail('El cargo previsto no corresponde al destinatario.');
        const original = created.get(`original:${charge.id_cargo_recurrente}`) || charge.programacion;
        if (JSON.stringify(original) !== JSON.stringify(item.expectedSchedule)) fail('El cargo previsto ha cambiado. Vuelve a comprobarlo.');
        created.set(`original:${charge.id_cargo_recurrente}`,original);
      }
      if (body.mode === 'charge' && !charge && !item.formerEmployee) fail('Selecciona o crea un cargo previsto.');
      if (charge && Number(line.importe) >= 0) fail('Los ingresos no admiten cargos previstos.');
      let snapshot = other ? null : line.nomina_revision;
      if (body.mode !== 'review' && item.entityType === 'nomina') snapshot = {...snapshot,ex_empleado:item.formerEmployee === true};
      if (body.mode === 'review' && item.entityType === 'nomina') snapshot = await payroll(db, line, item, charge);
      if (charge && item.entityType === 'proveedor' && item.increase) {
        const amount = Math.abs(Number(line.importe));
        const rule = (created.get(`original:${charge.id_cargo_recurrente}`) || charge.programacion)[Number(item.ruleIndex || 0)];
        if (!rule || cents(amount) <= cents(rule.total_iva)) fail('El movimiento no supera el importe previsto.');
        const schedule = charge.programacion.map(r => ({ ...r, total_iva: amount, base_imponible: Math.round(amount / (item.vat === false ? 1 : 1.21) * 100) / 100 }));
        validateRecurringCharge({ ...charge, programacion: schedule });
        await db.query('UPDATE tesoreria_cargos_recurrentes SET programacion=$1::jsonb,updated_at=NOW() WHERE id_cargo_recurrente=$2', [JSON.stringify(schedule),charge.id_cargo_recurrente]);
      }
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
        orderId = item.orderId;
      }
      const comments = body.mode === 'review' && item.entityType === 'proveedor' && item.commentsEdited === true ? item.comments : null;
      if(comments !== null && (typeof comments !== 'string' || comments.length>30000))fail('Revisa los comentarios del movimiento.');
      saved.push((await db.query('UPDATE tesoreria_movimientos_bancarios SET id_proveedor=$1,id_cuenta=$2,id_agente=$3,id_cargo_recurrente=$4,id_pago=$5,id_orden=$6,estado_revision=$7,nomina_revision=$8::jsonb,comentarios=COALESCE($10,comentarios),updated_at=NOW() WHERE id_linea_banco=$9 RETURNING *', [item.entityType === 'proveedor' ? item.entityId : null,item.entityType === 'cliente' ? item.entityId : null,item.entityType === 'nomina' ? item.entityId : null,charge?.id_cargo_recurrente || null,paymentId,orderId,body.mode === 'review' ? true : other ? false : line.estado_revision,JSON.stringify(snapshot),line.id_linea_banco,comments])).rows[0]);
    }
    if (!saved.length) fail('No quedan movimientos para guardar.');
    await db.query('COMMIT'); return saved;
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
