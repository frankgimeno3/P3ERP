import { getPgPool } from '../../database/pgClient.js';

export class RecurringChargeError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function validateRecurringCharge(body) {
  const tipo = body.tipo_cargo || 'proveedor';
  if (!['proveedor', 'nomina'].includes(tipo) || (tipo === 'nomina' ? !body.id_agente || body.id_proveedor : body.id_agente)) throw new RecurringChargeError('Selecciona el tipo y su proveedor o empleado correspondiente.');
  if (!['fechas', 'periodicidad'].includes(body.tipo_programacion) || !Array.isArray(body.programacion) || !body.programacion.length) throw new RecurringChargeError('Completa la programación.');
  const programacion = body.programacion.map(row => {
    if (!row || !Number.isFinite(Number(row.total_iva)) || Number(row.total_iva) <= 0 || Number(row.total_iva) > 9999999999.99 || !Number.isFinite(Number(row.base_imponible ?? 0)) || Number(row.base_imponible ?? 0) < 0) throw new RecurringChargeError('Revisa los importes de todas las filas.');
    if (body.tipo_programacion === 'fechas') {
      const year = row.anio === undefined ? 2000 : Number(row.anio), month = Number(row.mes), day = Number(row.dia);
      const date = new Date(Date.UTC(year, month - 1, day));
      if (!Number.isInteger(year) || year < 1900 || year > 9999 || !Number.isInteger(month) || !Number.isInteger(day) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new RecurringChargeError('Revisa las fechas de la programación.');
    } else if (!Number.isInteger(Number(row.cada)) || Number(row.cada) < 1 || !['días', 'semanas', 'meses'].includes(row.unidad)) throw new RecurringChargeError('Revisa la periodicidad.');
    return { ...row, base_imponible: tipo === 'nomina' ? 0 : Number(row.base_imponible || 0), total_iva: Number(row.total_iva) };
  });
  return { tipo_cargo: tipo, id_proveedor: tipo === 'proveedor' ? body.id_proveedor || null : null, id_agente: tipo === 'nomina' ? body.id_agente : null, tipo_programacion: body.tipo_programacion, programacion };
}
export async function findPayrollCharge(db, employeeId) {
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`cargo-nomina:${employeeId}`]);
  return (await db.query("SELECT * FROM cargos_recurrentes WHERE tipo_cargo='nomina' AND id_agente=$1 AND activo=TRUE", [employeeId])).rows[0] || null;
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
  return (await db.query('INSERT INTO cargos_recurrentes(tipo_cargo,id_proveedor,id_agente,tipo_programacion,programacion) VALUES($1,$2,$3,$4,$5::jsonb) RETURNING *', [data.tipo_cargo, data.id_proveedor, data.id_agente, data.tipo_programacion, JSON.stringify(data.programacion)])).rows[0];
}
export async function createRecurringCharge(body) {
  const db = await getPgPool().connect();
  try { await db.query('BEGIN'); const row = await insertRecurringCharge(db, body); await db.query('COMMIT'); return row; }
  catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
export async function listRecurringCharges() {
  return (await getPgPool().query(`SELECT cr.*,p.nombre_proveedor,
    COALESCE(NULLIF(a.nombre_completo_agente,''),NULLIF(trim(concat_ws(' ',a.nombre_agente,a.apellidos_agente)),''),a.id_agente) AS nombre_agente
    FROM cargos_recurrentes cr LEFT JOIN proveedores_db p USING(id_proveedor)
    LEFT JOIN agentes_db a ON a.id_agente=cr.id_agente WHERE cr.activo=TRUE ORDER BY cr.created_at DESC`)).rows;
}

export async function getRecurringCharge(id) {
  const row=(await getPgPool().query('SELECT * FROM cargos_recurrentes WHERE id_cargo_recurrente=$1',[id])).rows[0];
  if(!row)throw new RecurringChargeError('Cargo previsto no encontrado.',404);
  row.movimientos=(await getPgPool().query('SELECT * FROM lineas_bancos WHERE id_cargo_recurrente=$1 ORDER BY created_at DESC,id_linea_banco',[id])).rows;
  return row;
}
export async function deleteRecurringCharge(id,body) {
  const db=await getPgPool().connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    const row=(await db.query('SELECT * FROM cargos_recurrentes WHERE id_cargo_recurrente=$1 FOR UPDATE',[id])).rows[0];
    if(!row)throw new RecurringChargeError('Cargo previsto no encontrado.',404);
    if(!body.confirm || new Date(body.version).getTime()!==new Date(row.updated_at).getTime())throw new RecurringChargeError('Confirma la eliminación con los datos actualizados.',409);
    const detached=await db.query("UPDATE lineas_bancos SET id_cargo_recurrente=NULL,nomina_revision=CASE WHEN jsonb_typeof(nomina_revision)='object' THEN nomina_revision-'id_cargo_recurrente' ELSE nomina_revision END,updated_at=now() WHERE id_cargo_recurrente=$1 RETURNING id_linea_banco",[id]);
    await db.query('DELETE FROM cargos_recurrentes WHERE id_cargo_recurrente=$1',[id]);
    await db.query('COMMIT');return {ok:true,desasignados:detached.rowCount};
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
}
export async function updateRecurringCharge(id,body) {
  const db=await getPgPool().connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    const row=(await db.query('SELECT * FROM cargos_recurrentes WHERE id_cargo_recurrente=$1 FOR UPDATE',[id])).rows[0];
    if(!row)throw new RecurringChargeError('Cargo previsto no encontrado.',404);
    const canonical=value=>JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
    if(canonical(body.expectedSchedule)!==canonical(row.programacion)||body.expectedType!==row.tipo_programacion)throw new RecurringChargeError('La previsión ha cambiado. Recarga antes de guardar.',409);
    const data=validateRecurringCharge({...row,tipo_programacion:body.tipo_programacion,programacion:body.programacion});
    const result=(await db.query('UPDATE cargos_recurrentes SET tipo_programacion=$2,programacion=$3::jsonb,updated_at=now() WHERE id_cargo_recurrente=$1 RETURNING *',[id,data.tipo_programacion,JSON.stringify(data.programacion)])).rows[0];
    await db.query('COMMIT');return result;
  } catch(error) {await db.query('ROLLBACK');throw error;} finally {db.release();}
}
