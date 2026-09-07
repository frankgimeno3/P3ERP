import { randomUUID } from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
import { LaboralError, validate } from './validation.js';

const employeeName = "COALESCE(NULLIF(a.nombre_completo_agente,''), NULLIF(trim(a.nombre_agente || ' ' || a.apellidos_agente),''), a.id_agente)";
async function one(db, sql, values) {
  const { rows } = await db.query(sql, values);
  if (!rows[0]) throw new LaboralError('Registro no encontrado.', 404);
  return rows[0];
}
async function transaction(callback) {
  const client = await getPgPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
async function employee(db, id, requireActive = false) {
  const row = await one(db, `SELECT * FROM agentes_db WHERE id_agente=$1`, [id]);
  if (requireActive && !row.is_empleado_account) throw new LaboralError('El agente no está marcado como cuenta de empleado.');
  return row;
}
const paymentTable = kind => kind === 'nominas' ? 'nominas' : 'anticipos_empleados';

export async function listEmployees() {
  return (await getPgPool().query(`SELECT a.*, ${employeeName} AS nombre FROM agentes_db a WHERE is_empleado_account=TRUE ORDER BY nombre`)).rows;
}
export async function listPayments(kind) {
  return (await getPgPool().query(`SELECT p.*, ${employeeName} AS empleado FROM ${paymentTable(kind)} p JOIN agentes_db a ON a.id_agente=p.id_empleado ORDER BY p.anio DESC,p.mes DESC,empleado,p.created_at DESC`)).rows;
}
export async function getPayment(kind, id) {
  const db = getPgPool();
  const payment = await one(db, `SELECT p.*, ${employeeName} AS empleado FROM ${paymentTable(kind)} p JOIN agentes_db a ON a.id_agente=p.id_empleado WHERE p.id=$1`, [id]);
  const advances = kind === 'nominas' ? (await db.query('SELECT * FROM anticipos_empleados WHERE id=ANY($1::text[]) ORDER BY created_at', [payment.anticipos])).rows : [];
  const transferIds = [payment.id_transferencia, ...advances.map(a => a.id_transferencia)].filter(Boolean);
  const transfers = transferIds.length ? (await db.query('SELECT * FROM lineas_bancos WHERE id_linea_banco=ANY($1::text[])', [transferIds])).rows : [];
  const paid = advances.filter(a => a.estado === 'pagado').reduce((sum, a) => sum + Math.round(Number(a.importe_neto) * 100), 0);
  return { ...payment, detalle_anticipos: advances, transferencias: transfers, total_anticipos_pagados: paid / 100, importe_transferencia_nomina: (Math.round(Number(payment.importe_neto) * 100) - paid) / 100 };
}
async function checkTransfer(db, transferId, employeeId, kind, id) {
  if (!transferId) return;
  const bank = await one(db, 'SELECT * FROM lineas_bancos WHERE id_linea_banco=$1 FOR UPDATE', [transferId]);
  if (Number(bank.importe) >= 0) throw new LaboralError('Selecciona un movimiento de salida para la transferencia.');
  if (bank.id_proveedor || bank.id_cuenta || bank.id_pago || bank.id_orden || bank.id_cargo_recurrente || (bank.id_agente && bank.id_agente !== employeeId)) throw new LaboralError('El movimiento bancario ya está asignado a otro concepto o persona.');
  const used = await db.query("SELECT id FROM nominas WHERE id_transferencia=$1 AND NOT ($2='nominas' AND id=$3) UNION ALL SELECT id FROM anticipos_empleados WHERE id_transferencia=$1 AND NOT ($2='anticipos' AND id=$3)", [transferId, kind, id]);
  if (used.rowCount) throw new LaboralError('Esta transferencia ya está vinculada a una nómina o anticipo.');
}
async function syncAdvances(db, employeeId, year, month) {
  const { rows } = await db.query('SELECT id,importe_neto,estado FROM anticipos_empleados WHERE id_empleado=$1 AND anio=$2 AND mes=$3 ORDER BY created_at', [employeeId, year, month]);
  const { rows: payrolls } = await db.query('SELECT * FROM nominas WHERE id_empleado=$1 AND anio=$2 AND mes=$3 FOR UPDATE', [employeeId, year, month]);
  if (!payrolls.length) return;
  const paid = rows.filter(a => a.estado === 'pagado').reduce((sum, a) => sum + Math.round(Number(a.importe_neto) * 100), 0);
  if (paid > Math.round(Number(payrolls[0].importe_neto) * 100)) throw new LaboralError('Los anticipos pagados superan el importe neto de la nómina. Revisa los importes.');
  await db.query('UPDATE nominas SET anticipos=$1,updated_at=NOW() WHERE id=$2', [rows.map(a => a.id), payrolls[0].id]);
}
export async function savePayment(kind, id, body) {
  const data = validate(kind, body);
  return transaction(async db => {
    // Serializes the two payment tables so a transfer cannot be claimed twice.
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    const previous = id ? await one(db, `SELECT * FROM ${paymentTable(kind)} WHERE id=$1 FOR UPDATE`, [id]) : null;
    await employee(db, data.id_empleado, !previous || previous.id_empleado !== data.id_empleado);
    if (previous && (previous.id_empleado !== data.id_empleado || previous.mes !== data.mes || previous.anio !== data.anio)) throw new LaboralError('El empleado y el periodo de un registro existente no se pueden cambiar.');
    const recordId = id || randomUUID();
    await checkTransfer(db, data.id_transferencia, data.id_empleado, kind, recordId);
    const values = [data.id_empleado, data.mes, data.anio, data.importe_neto, data.estado, data.comentarios, data.id_transferencia || null, recordId];
    if (id) await db.query(`UPDATE ${paymentTable(kind)} SET id_empleado=$1,mes=$2,anio=$3,importe_neto=$4,estado=$5,comentarios=$6,id_transferencia=$7,updated_at=NOW() WHERE id=$8`, values);
    else await db.query(`INSERT INTO ${paymentTable(kind)} (id_empleado,mes,anio,importe_neto,estado,comentarios,id_transferencia,id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, values);
    await syncAdvances(db, data.id_empleado, data.anio, data.mes);
    return { id: recordId };
  });
}
export async function listTransfers(employeeId) {
  return (await getPgPool().query(`SELECT b.id_linea_banco,b.banco,b.fecha_valor,b.concepto,b.importe FROM lineas_bancos b
    WHERE b.importe<0 AND b.id_proveedor IS NULL AND b.id_cuenta IS NULL AND b.id_pago IS NULL AND b.id_orden IS NULL AND b.id_cargo_recurrente IS NULL AND (b.id_agente IS NULL OR b.id_agente=$1)
    ORDER BY b.created_at DESC`, [employeeId || ''])).rows;
}
export async function listCalendars() {
  return (await getPgPool().query('SELECT c.anio,COUNT(e.id)::int AS eventos FROM calendarios_laborales c LEFT JOIN eventos_calendario_laboral e ON e.anio=c.anio GROUP BY c.anio ORDER BY c.anio DESC')).rows;
}
export async function createCalendar(body) {
  const { anio } = validate('calendario', body);
  return one(getPgPool(), 'INSERT INTO calendarios_laborales(anio) VALUES ($1) ON CONFLICT(anio) DO UPDATE SET anio=EXCLUDED.anio RETURNING *', [anio]);
}
export async function getCalendar(year) {
  const { anio } = validate('calendario', { anio: year });
  await one(getPgPool(), 'SELECT anio FROM calendarios_laborales WHERE anio=$1', [anio]);
  return { anio, eventos: (await getPgPool().query('SELECT e.*,e.inicio::text,e.fin::text FROM eventos_calendario_laboral e WHERE anio=$1 ORDER BY e.inicio,e.titulo', [anio])).rows };
}
export async function saveEvent(id, body) {
  const d = validate('eventos', body), db = getPgPool();
  const values = [d.anio,d.tipo,d.titulo,d.inicio,d.fin,d.comentarios,id || randomUUID()];
  return one(db, id ? 'UPDATE eventos_calendario_laboral SET anio=$1,tipo=$2,titulo=$3,inicio=$4,fin=$5,comentarios=$6 WHERE id=$7 RETURNING id' : 'INSERT INTO eventos_calendario_laboral(anio,tipo,titulo,inicio,fin,comentarios,id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', values);
}
export async function getEmployee(id, year) {
  const { anio } = validate('calendario', { anio: year });
  const db = getPgPool(), agente = await employee(db, id);
  const [libres, ausencias, comentarios] = await Promise.all([
    db.query('SELECT numero,fecha::text FROM empleados_libre_disposicion WHERE id_empleado=$1 AND anio=$2 ORDER BY numero', [id, anio]),
    db.query('SELECT a.*,a.inicio::text,a.fin::text FROM ausencias_empleados a WHERE id_empleado=$1 AND inicio <= make_date($2,12,31) AND fin >= make_date($2,1,1) ORDER BY a.inicio DESC', [id, anio]),
    db.query('SELECT * FROM comentarios_empleados WHERE id_empleado=$1 ORDER BY created_at DESC', [id]),
  ]);
  return { agente, anio, libres: libres.rows, ausencias: ausencias.rows, comentarios: comentarios.rows };
}
export async function saveFreeDays(id, body) {
  const d = validate('libres', body);
  return transaction(async db => {
    await one(db, 'SELECT id_agente FROM agentes_db WHERE id_agente=$1 FOR UPDATE', [id]);
    await db.query('DELETE FROM empleados_libre_disposicion WHERE id_empleado=$1 AND anio=$2', [id,d.anio]);
    for (const day of d.fechas) await db.query('INSERT INTO empleados_libre_disposicion(id_empleado,anio,numero,fecha) VALUES ($1,$2,$3,$4)', [id,d.anio,day.numero,day.fecha]);
    return { ok: true };
  });
}
export async function saveAbsence(employeeId, id, body) {
  const d = validate('ausencias', body);
  return one(getPgPool(), id ? 'UPDATE ausencias_empleados SET tipo=$1,inicio=$2,fin=$3,comentarios=$4 WHERE id_empleado=$5 AND id=$6 RETURNING id' : 'INSERT INTO ausencias_empleados(tipo,inicio,fin,comentarios,id_empleado,id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [d.tipo,d.inicio,d.fin,d.comentarios,employeeId,id || randomUUID()]);
}
export async function addComment(employeeId, body) {
  const d = validate('comentarios', body);
  return one(getPgPool(), 'INSERT INTO comentarios_empleados(id,id_empleado,comentario) VALUES ($1,$2,$3) RETURNING *', [randomUUID(),employeeId,d.comentario]);
}
export async function listProcesses() {
  return (await getPgPool().query('SELECT p.*,COUNT(c.id)::int AS candidatos FROM procesos_contratacion p LEFT JOIN candidatos_contratacion c ON c.id_proceso=p.id GROUP BY p.id ORDER BY p.created_at DESC')).rows;
}
export async function getProcess(id) {
  const db = getPgPool(), process = await one(db, 'SELECT * FROM procesos_contratacion WHERE id=$1', [id]);
  return { ...process, candidatos: (await db.query('SELECT * FROM candidatos_contratacion WHERE id_proceso=$1 ORDER BY created_at,nombre', [id])).rows };
}
export async function saveProcess(id, body) {
  const d = validate('procesos', body);
  return one(getPgPool(), id ? 'UPDATE procesos_contratacion SET nombre=$1,oferta_condiciones=$2,mensaje_pre_llamada=$3,mensaje_post_llamada=$4,mensaje_rechazo=$5,updated_at=NOW() WHERE id=$6 RETURNING id' : 'INSERT INTO procesos_contratacion(nombre,oferta_condiciones,mensaje_pre_llamada,mensaje_post_llamada,mensaje_rechazo,id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [d.nombre,d.oferta_condiciones,d.mensaje_pre_llamada,d.mensaje_post_llamada,d.mensaje_rechazo,id || randomUUID()]);
}
export async function saveCandidate(processId, id, body) {
  const d = validate('candidatos', body);
  return one(getPgPool(), id ? 'UPDATE candidatos_contratacion SET nombre=$1,resumen_cv=$2,comentarios=$3,estado=$4,updated_at=NOW() WHERE id_proceso=$5 AND id=$6 RETURNING id' : 'INSERT INTO candidatos_contratacion(nombre,resumen_cv,comentarios,estado,id_proceso,id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [d.nombre,d.resumen_cv,d.comentarios,d.estado,processId,id || randomUUID()]);
}
export async function deleteRecord(kind, id, parentId) {
  const tables = { eventos: ['eventos_calendario_laboral', null], ausencias: ['ausencias_empleados','id_empleado'], comentarios: ['comentarios_empleados','id_empleado'], candidatos: ['candidatos_contratacion','id_proceso'] };
  if (!tables[kind]) throw new LaboralError('Operación no disponible.', 404);
  const [table, parent] = tables[kind];
  return one(getPgPool(), `DELETE FROM ${table} WHERE id=$1 ${parent ? `AND ${parent}=$2` : ''} RETURNING id`, parent ? [id,parentId] : [id]);
}

export const documentOwners = { empleados: ['id_empleado','agentes_db','id_agente'], nominas: ['id_nomina','nominas','id'], anticipos: ['id_anticipo','anticipos_empleados','id'] };
export async function documentOwner(kind, id) {
  const config = documentOwners[kind];
  if (!config) throw new LaboralError('Tipo de documentación no válido.');
  await one(getPgPool(), `SELECT ${config[2]} FROM ${config[1]} WHERE ${config[2]}=$1`, [id]);
  return config[0];
}
export async function listDocuments(kind, id) {
  const column = await documentOwner(kind, id);
  return (await getPgPool().query(`SELECT id,nombre,content_type,tamano,created_at FROM documentos_laborales WHERE ${column}=$1 ORDER BY created_at DESC`, [id])).rows;
}
export async function addDocument(kind, ownerId, data) {
  const column = await documentOwner(kind, ownerId);
  return one(getPgPool(), `INSERT INTO documentos_laborales(id,${column},nombre,content_type,tamano,s3_key,contenido) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,nombre`, [data.id,ownerId,data.nombre,data.contentType,data.size,data.key || null,data.contenido || null]);
}
export async function getDocument(id) { return one(getPgPool(), 'SELECT * FROM documentos_laborales WHERE id=$1', [id]); }
