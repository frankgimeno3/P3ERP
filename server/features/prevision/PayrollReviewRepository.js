import { getPgPool } from '../../database/pgClient.js';
import { findPayrollCharge, insertRecurringCharge, RecurringChargeError } from './RecurringChargeRepository.js';

export const payrollAmount = charge => charge?.programacion?.length === 1 ? Number(charge.programacion[0].total_iva) : null;
export async function reviewPayrollMovement(id, body) {
  if (!body.id_agente || !['coincide','crear','actualizar','puntual'].includes(body.decision)) throw new RecurringChargeError('Selecciona empleado y resolución de la nómina.');
  const db = await getPgPool().connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    const line = (await db.query('SELECT * FROM lineas_bancos WHERE id_linea_banco=$1 FOR UPDATE', [id])).rows[0];
    if (!line) throw new RecurringChargeError('Movimiento no encontrado.',404);
    if (Number(line.importe) >= 0) throw new RecurringChargeError('Una nómina debe ser un cargo negativo.');
    if (line.id_pago || line.id_orden || line.id_cargo_recurrente) throw new RecurringChargeError('El movimiento ya está vinculado a otro pago o previsión.',409);
    const linked = await db.query('SELECT id_empleado FROM nominas WHERE id_transferencia=$1 UNION ALL SELECT id_empleado FROM anticipos_empleados WHERE id_transferencia=$1', [id]);
    if (linked.rows.some(row => row.id_empleado !== body.id_agente)) throw new RecurringChargeError('La transferencia pertenece a otro empleado.',409);
    if (!(await db.query('SELECT id_agente FROM agentes_db WHERE id_agente=$1 AND is_empleado_account=TRUE FOR SHARE', [body.id_agente])).rowCount) throw new RecurringChargeError('Selecciona una cuenta de empleado válida.');
    let charge = await findPayrollCharge(db,body.id_agente);
    const amount = Math.round(Math.abs(Number(line.importe)) * 100) / 100;
    if (String(charge?.id_cargo_recurrente || '') !== String(body.expectedChargeId || '') || (charge && JSON.stringify(charge.programacion) !== JSON.stringify(body.expectedSchedule))) throw new RecurringChargeError('La nómina pactada ha cambiado. Recarga el movimiento para comprobarla.',409);
    const previousAmount = payrollAmount(charge);
    if (body.decision === 'crear') {
      if (charge) throw new RecurringChargeError('El empleado ya tiene una nómina recurrente.',409);
      charge = await insertRecurringCharge(db,{ tipo_cargo:'nomina',id_agente:body.id_agente,tipo_programacion:'periodicidad',programacion:[{ cada:1,unidad:'meses',base_imponible:0,total_iva:amount,descripcion:'Nómina mensual' }] });
    } else {
      if (!charge) throw new RecurringChargeError('Registra primero la nómina recurrente.',409);
      if (body.decision === 'coincide' && (previousAmount === null || Math.round(previousAmount * 100) !== Math.round(amount * 100))) throw new RecurringChargeError('El importe no coincide. Modifica la previsión o acepta el caso puntual.',409);
      if (body.decision === 'actualizar') charge = (await db.query("UPDATE cargos_recurrentes SET tipo_programacion='periodicidad',programacion=$1::jsonb,updated_at=NOW() WHERE id_cargo_recurrente=$2 RETURNING *", [JSON.stringify([{cada:1,unidad:'meses',base_imponible:0,total_iva:amount,descripcion:charge.programacion?.[0]?.descripcion || 'Nómina mensual'}]),charge.id_cargo_recurrente])).rows[0];
    }
    const snapshot = { id_agente:body.id_agente,id_cargo_recurrente:charge.id_cargo_recurrente,importe_previsto:payrollAmount(charge),importe_anterior:previousAmount,importe_movimiento:amount,decision:body.decision,fecha_revision:new Date().toISOString() };
    const saved = (await db.query('UPDATE lineas_bancos SET id_agente=$1,id_proveedor=NULL,id_cuenta=NULL,estado_revision=TRUE,comentarios=COALESCE($2,comentarios),nomina_revision=$3::jsonb,updated_at=NOW() WHERE id_linea_banco=$4 RETURNING *', [body.id_agente,body.comentarios,JSON.stringify(snapshot),id])).rows[0];
    await db.query('COMMIT');
    return saved;
  } catch(error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
