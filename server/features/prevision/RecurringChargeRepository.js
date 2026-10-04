import { getPgPool } from '../../database/pgClient.js';
import { extendCharge, withStart, todayInSpain, horizon } from './RecurringChargePlanning.js';
import { randomUUID } from 'node:crypto';
import { withRuleIds, ruleStart,dateISO } from '../banco/BankReviewAnalysis.js';
import {forecastRuleVat} from '../../../app/lib/forecastVat.js';

export class RecurringChargeError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function validateRecurringCharge(body) {
  const tipo = body.tipo_cargo || 'proveedor';
  if (body.banco_pago && !['Sabadell','Santander'].includes(body.banco_pago)) throw new RecurringChargeError('Selecciona un banco válido.');
  if (!['proveedor', 'nomina', 'otro'].includes(tipo) || (tipo === 'nomina' ? !body.id_agente || body.id_proveedor : body.id_agente) || tipo === 'otro' && body.id_proveedor) throw new RecurringChargeError('Selecciona el tipo y su proveedor o empleado correspondiente. Otro no admite destinatario.');
  if (!['fechas', 'periodicidad'].includes(body.tipo_programacion) || !Array.isArray(body.programacion) || !body.programacion.length) throw new RecurringChargeError('Completa la programación.');
  const programacion = body.programacion.map(row => {
    if(tipo!=='nomina'&&(typeof row?.contains_iva==='boolean'||body.requires_vat_confirmation))row=forecastRuleVat(row);
    if(row?.importes_por_fecha&&Object.entries(row.importes_por_fecha).some(([date,value])=>!dateISO(date)||!Number.isFinite(Number(value))||Number(value)<0||Number(value)>9999999999.99))throw new RecurringChargeError('Revisa los importes de las excepciones por fecha.');
    if (!row || !Number.isFinite(Number(row.total_iva)) || Number(row.total_iva) <= 0 || Number(row.total_iva) > 9999999999.99 || !Number.isFinite(Number(row.base_imponible ?? 0)) || Number(row.base_imponible ?? 0) < 0) throw new RecurringChargeError('Revisa los importes de todas las filas.');
    if (body.tipo_programacion === 'fechas') {
      const year = row.anio === undefined ? 2000 : Number(row.anio), month = Number(row.mes), day = Number(row.dia);
      const date = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isInteger(year) || year < 1900 || year > 9999 || !Number.isInteger(month) || !Number.isInteger(day) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new RecurringChargeError('Revisa las fechas de la programación.');
    } else if (!Number.isInteger(Number(row.cada)) || Number(row.cada) < 1 || !['días', 'semanas', 'meses'].includes(row.unidad)) throw new RecurringChargeError('Revisa la periodicidad.');
    if ([row.inicio_dia,row.inicio_mes,row.inicio_anio].some(Boolean) && !ruleStart(row)) throw new RecurringChargeError('Completa una fecha de inicio válida para la periodicidad.');
    return { ...(tipo !== 'nomina' && body.tipo_programacion === 'periodicidad' ? withStart(row, todayInSpain()) : row), id_regla: row.id_regla || randomUUID(), base_imponible: tipo === 'nomina' ? 0 : Number(row.base_imponible || 0), total_iva: Number(row.total_iva) };
  });
  if (new Set(programacion.map(r=>r.id_regla)).size !== programacion.length) throw new RecurringChargeError('Las reglas de programación deben tener identificadores distintos.');
  return { banco_pago: body.banco_pago || null, tipo_cargo: tipo, id_proveedor: tipo === 'proveedor' ? body.id_proveedor || null : null, id_agente: tipo === 'nomina' ? body.id_agente : null, tipo_programacion: body.tipo_programacion, termina_planificacion: body.termina_planificacion === true, programacion };
}
export async function findPayrollCharge(db, employeeId) {
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`cargo-nomina:${employeeId}`]);
  return (await db.query("SELECT * FROM tesoreria_cargos_recurrentes WHERE tipo_cargo='nomina' AND id_agente=$1 AND activo=TRUE", [employeeId])).rows[0] || null;
}
// Caller owns the transaction so bank assignments and charge creation commit together.
export async function insertRecurringCharge(db, body, reusePayroll = false) {
  const data = validateRecurringCharge(body);
  if (data.tipo_cargo === 'nomina') {
    const existing = await findPayrollCharge(db, data.id_agente);
    if (existing) {
      if (reusePayroll) return existing;
      throw new RecurringChargeError('Este empleado ya tiene un cargo previsto activo.', 409);
    }
    if (!(await db.query('SELECT id_agente FROM agentes_db WHERE id_agente=$1 AND is_empleado_account=TRUE FOR SHARE', [data.id_agente])).rowCount) throw new RecurringChargeError('Selecciona una cuenta de empleado válida.');
  }
  const created = (await db.query('INSERT INTO tesoreria_cargos_recurrentes(tipo_cargo,id_proveedor,id_agente,tipo_programacion,programacion,termina_planificacion) VALUES($1,$2,$3,$4,$5::jsonb,$6) RETURNING *', [data.tipo_cargo, data.id_proveedor, data.id_agente, data.tipo_programacion, JSON.stringify(data.programacion),data.termina_planificacion])).rows[0];
  await extendCharge(db,created);
  if(data.banco_pago) await db.query('UPDATE tesoreria_cargos_recurrentes SET banco_pago=$2 WHERE id_cargo_recurrente=$1',[created.id_cargo_recurrente,data.banco_pago]);
  return (await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1',[created.id_cargo_recurrente])).rows[0];
}
export async function createRecurringCharge(body) {
  const db = await getPgPool().connect();
  try { await db.query('BEGIN'); await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))"); const row = await insertRecurringCharge(db, body); await db.query('COMMIT'); return row; }
  catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
export async function listRecurringCharges() {
  return (await getPgPool().query(`SELECT cr.*,p.nombre_proveedor, COALESCE((SELECT jsonb_agg(to_jsonb(v)||jsonb_build_object('fecha',to_char(v.fecha,'YYYY-MM-DD')) ORDER BY v.fecha) FROM tesoreria_cargos_vencimientos v WHERE v.id_cargo_recurrente=cr.id_cargo_recurrente),'[]'::jsonb) vencimientos,
    COALESCE(NULLIF(a.nombre_completo_agente,''),NULLIF(trim(concat_ws(' ',a.nombre_agente,a.apellidos_agente)),''),a.id_agente) AS nombre_agente
    FROM tesoreria_cargos_recurrentes cr LEFT JOIN administracion_proveedores p USING(id_proveedor)
    LEFT JOIN agentes_db a ON a.id_agente=cr.id_agente WHERE cr.activo=TRUE ORDER BY cr.created_at DESC`)).rows.map(withRuleIds);
}

export async function getRecurringCharge(id) {
  const row=(await getPgPool().query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1',[id])).rows[0];
  if(!row)throw new RecurringChargeError('Cargo previsto no encontrado.',404);
  row.vencimientos=(await getPgPool().query("SELECT *,to_char(fecha,'YYYY-MM-DD') fecha FROM tesoreria_cargos_vencimientos WHERE id_cargo_recurrente=$1 ORDER BY tesoreria_cargos_vencimientos.fecha",[id])).rows;
  row.movimientos=(await getPgPool().query('SELECT * FROM tesoreria_movimientos_bancarios WHERE id_cargo_recurrente=$1 ORDER BY created_at DESC,id_linea_banco',[id])).rows;
  return withRuleIds(row);
}
export async function deleteRecurringCharge(id,body) {
  const db=await getPgPool().connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    const row=(await db.query("SELECT *,to_char(planificado_hasta,'YYYY-MM-DD') AS planificado_hasta FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1 FOR UPDATE",[id])).rows[0];
    if(!row)throw new RecurringChargeError('Cargo previsto no encontrado.',404);
    if(!body.confirm || new Date(body.version).getTime()!==new Date(row.updated_at).getTime())throw new RecurringChargeError('Confirma la eliminación con los datos actualizados.',409);
    const detached=await db.query("UPDATE tesoreria_movimientos_bancarios SET id_cargo_recurrente=NULL,nomina_revision=CASE WHEN jsonb_typeof(nomina_revision)='object' THEN nomina_revision-'id_cargo_recurrente' ELSE nomina_revision END,updated_at=now() WHERE id_cargo_recurrente=$1 RETURNING id_linea_banco",[id]);
    await db.query('DELETE FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1',[id]);
    await db.query('COMMIT');return {ok:true,desasignados:detached.rowCount};
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
}
export async function updateRecurringCharge(id,body,requiredCard=null) {
  const db=await getPgPool().connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    const row=(await db.query("SELECT *,to_char(planificado_hasta,'YYYY-MM-DD') AS planificado_hasta FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1 FOR UPDATE",[id])).rows[0];
    if(!row)throw new RecurringChargeError('Cargo previsto no encontrado.',404);
    if(requiredCard&&row.id_tarjeta!==requiredCard)throw new RecurringChargeError('La suscripción no pertenece a esta tarjeta.',409);
    if(body.expectedVersion && new Date(body.expectedVersion).getTime()!==new Date(row.updated_at).getTime())throw new RecurringChargeError('La previsi\u00f3n ha cambiado. Recarga antes de guardar.',409);
    const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
    if(canonical(body.expectedSchedule)!==canonical(row.programacion)&&canonical(body.expectedSchedule)!==canonical(withRuleIds(row).programacion)||body.expectedType!==row.tipo_programacion)throw new RecurringChargeError('La previsión ha cambiado. Recarga antes de guardar.',409);
    const data=validateRecurringCharge({...row,banco_pago:body.banco_pago === undefined ? row.banco_pago : body.banco_pago,tipo_programacion:body.tipo_programacion,programacion:body.programacion,termina_planificacion:body.termina_planificacion ?? row.termina_planificacion});
    const result=(await db.query('UPDATE tesoreria_cargos_recurrentes SET tipo_programacion=$2,programacion=$3::jsonb,termina_planificacion=$4,updated_at=now() WHERE id_cargo_recurrente=$1 RETURNING *',[id,data.tipo_programacion,JSON.stringify(data.programacion),data.termina_planificacion])).rows[0];
    if (canonical(data.programacion)!==canonical(withRuleIds(row).programacion)||data.tipo_programacion!==row.tipo_programacion) {
      await db.query("DELETE FROM tesoreria_cargos_vencimientos v WHERE id_cargo_recurrente=$1 AND NOT EXISTS(SELECT 1 FROM tesoreria_vencimientos_aplicaciones a WHERE a.id_vencimiento=v.id) AND NOT EXISTS(SELECT 1 FROM administracion_tickets t WHERE t.id_vencimiento_tarjeta=v.id)",[id]);
      await extendCharge(db,{...result,planificado_hasta:null},todayInSpain(),true,result.termina_planificacion && row.planificado_hasta ? new Date(row.planificado_hasta).toISOString().slice(0,10) : horizon(todayInSpain()));
    }
    await db.query('UPDATE tesoreria_cargos_recurrentes SET banco_pago=$2 WHERE id_cargo_recurrente=$1',[id,data.banco_pago]);
    await db.query('COMMIT');return {...result,banco_pago:data.banco_pago};
  } catch(error) {await db.query('ROLLBACK');throw error;} finally {db.release();}
}

export async function extendRecurringCharges() {
  const db=await getPgPool().connect();
  try { await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    const charges=(await db.query("SELECT * FROM tesoreria_cargos_recurrentes WHERE activo=TRUE AND tipo_cargo IN ('proveedor','otro') ORDER BY id_cargo_recurrente FOR UPDATE")).rows;
    let generated=0;
    for(const charge of charges) generated+=await extendCharge(db,charge);
    await db.query('COMMIT');return {generated,until:horizon(todayInSpain())};
  } catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
