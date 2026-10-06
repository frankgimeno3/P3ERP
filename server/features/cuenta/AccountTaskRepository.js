import { randomUUID } from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
import { accountTaskTypes, canManageAccountTasks } from '../../../app/config/accountTasks.js';
import { requireTaskIdentity } from '../laboral/TaskAccess.js';
import { addCuentaEvento } from '../registroEventos/RegistroEventosRepository.js';

const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const states = ['pendiente', 'en_curso', 'completada', 'cancelada'];
function date(value) {
  if (!value) return null;
  const raw = String(value);
  const local = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = local ? `${local[3]}-${local[2].padStart(2,'0')}-${local[1].padStart(2,'0')}` : raw;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !Number.isFinite(Date.parse(iso)) || new Date(iso).toISOString().slice(0,10) !== iso) fail('Completa una fecha límite válida en formato dd / mm / yyyy.');
  return iso;
}
function validate(body) {
  const nombre = String(body.nombre || '').trim(), descripcion = String(body.descripcion || '').trim(), referencia = String(body.referencia || '').trim();
  if (!nombre || nombre.length > 250 || descripcion.length > 10000 || referencia.length > 500) fail('Revisa el nombre, la descripción y la referencia de la tarea.');
  if (!Object.hasOwn(accountTaskTypes, body.tipo)) fail('Selecciona un tipo de tarea válido.');
  if (!states.includes(body.estado)) fail('Selecciona un estado válido.');
  if (!Array.isArray(body.agentes) || !body.agentes.length || body.agentes.some(id => typeof id !== 'string' || !id.trim())) fail('Asigna la tarea al menos a un agente.');
  const agentes = [...new Set(body.agentes.map(id => id.trim()))];
  return { nombre, descripcion, referencia, tipo: body.tipo, estado: body.estado, fecha_limite: date(body.fecha_limite), agentes };
}
const select = `SELECT t.*,to_char(t.fecha_limite,'DD/MM/YYYY') fecha_limite,c.nombre_empresa nombre_cuenta,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('id_agente',a.id_agente,'nombre',COALESCE(NULLIF(a.nombre_completo_agente,''),NULLIF(a.nombre_agente,''),a.id_agente)) ORDER BY a.nombre_completo_agente,a.id_agente)
    FROM comercial_cuenta_tarea_agentes ta JOIN agentes_db a USING(id_agente) WHERE ta.id_tarea=t.id),'[]'::jsonb) asignados
  FROM comercial_cuenta_tareas t JOIN comercial_cuentas c USING(id_cuenta)`;
function decorate(task, actor) {
  const assigned = task.asignados.some(a => a.id_agente === actor.id);
  return { ...task, origen: 'cuenta', agentes: task.asignados.map(a => a.id_agente), nombre_agente: task.asignados.map(a => a.nombre).join(', '),
    puede_editar: canManageAccountTasks(actor.role), puede_cambiar_estado: assigned || canManageAccountTasks(actor.role) };
}
export async function readAccountTask(actor, id, accountId, db = getPgPool(), ownOnly = false) {
  requireTaskIdentity(actor);
  const row = (await db.query(`${select} WHERE t.id=$1 AND ($2::text IS NULL OR t.id_cuenta=$2)`, [id, accountId || null])).rows[0];
  if (!row) fail('Tarea no encontrada.', 404);
  if (ownOnly && !row.asignados.some(a => a.id_agente === actor.id) && !canManageAccountTasks(actor.role)) fail('No tienes acceso a esta tarea.', 403);
  return decorate(row, actor);
}
export async function accountTasks(actor, { accountId, employee } = {}, db = getPgPool()) {
  requireTaskIdentity(actor);
  const rows = (await db.query(`${select} WHERE ($1::text IS NULL OR t.id_cuenta=$1)
    AND ($2::text IS NULL OR EXISTS(SELECT 1 FROM comercial_cuenta_tarea_agentes a WHERE a.id_tarea=t.id AND a.id_agente=$2))
    ORDER BY t.fecha_limite ASC NULLS LAST,t.created_at DESC,t.id`, [accountId || null, employee || null])).rows;
  return rows.map(row => decorate(row, actor));
}
export async function saveAccountTask(actor, accountId, id, body, statusOnly = false, pool = getPgPool()) {
  requireTaskIdentity(actor);
  if (!statusOnly && !canManageAccountTasks(actor.role)) fail('No tienes permisos para gestionar tareas de cuentas.', 403);
  if (statusOnly && !id) fail('Tarea no encontrada.', 404);
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const previous = id ? (await db.query("SELECT *,to_char(fecha_limite,'YYYY-MM-DD') fecha_limite FROM comercial_cuenta_tareas WHERE id=$1 AND id_cuenta=$2 FOR UPDATE", [id, accountId])).rows[0] : null;
    if (id && !previous) fail('Tarea no encontrada.', 404);
    if (previous && (!body.version || new Date(body.version).getTime() !== new Date(previous.updated_at).getTime())) fail('La tarea ha cambiado. Recarga antes de guardar.', 409);
    const assigned = previous ? (await db.query('SELECT id_agente FROM comercial_cuenta_tarea_agentes WHERE id_tarea=$1', [id])).rows.map(a => a.id_agente) : [];
    if (statusOnly && !canManageAccountTasks(actor.role) && !assigned.includes(actor.id)) fail('No tienes acceso a esta tarea.', 403);
    if (!(await db.query('SELECT 1 FROM comercial_cuentas WHERE id_cuenta=$1 FOR KEY SHARE', [accountId])).rowCount) fail('Cuenta no encontrada.', 404);
    const data = validate(statusOnly ? { ...previous, agentes: assigned, estado: body.estado } : { ...body, estado: body.estado || 'pendiente' });
    if (!statusOnly) {
      const valid = (await db.query(`SELECT id_agente FROM agentes_db WHERE id_agente=ANY($1::text[])
        AND COALESCE(is_empleado_account,true) AND lower(COALESCE(estado_agente,'')) NOT IN ('inactivo','borrador') FOR KEY SHARE`, [data.agentes])).rows;
      if (valid.length !== data.agentes.length) fail('Selecciona agentes activos con cuenta de empleado.');
    }
    const taskId = id || `cta_${randomUUID()}`;
    if (previous) await db.query(`UPDATE comercial_cuenta_tareas SET nombre=$2,tipo=$3,descripcion=$4,referencia=$5,fecha_limite=$6,estado=$7,
      updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 millisecond') WHERE id=$1`, [taskId,data.nombre,data.tipo,data.descripcion,data.referencia,data.fecha_limite,data.estado]);
    else await db.query('INSERT INTO comercial_cuenta_tareas(id,id_cuenta,nombre,tipo,descripcion,referencia,fecha_limite,estado) VALUES($1,$2,$3,$4,$5,$6,$7,$8)', [taskId,accountId,data.nombre,data.tipo,data.descripcion,data.referencia,data.fecha_limite,data.estado]);
    if (!statusOnly) {
      await db.query('DELETE FROM comercial_cuenta_tarea_agentes WHERE id_tarea=$1', [taskId]);
      for (const agent of data.agentes) await db.query('INSERT INTO comercial_cuenta_tarea_agentes(id_tarea,id_agente) VALUES($1,$2)', [taskId,agent]);
    }
    await addCuentaEvento({ idCuenta: accountId, idAgente: actor.id, detalles: `${previous ? 'Actualizada' : 'Creada'} tarea ${data.nombre}; estado ${data.estado}; agentes ${data.agentes.join(', ')}.`, eventType: 'Cambio por agente' }, db);
    const result = await readAccountTask(actor, taskId, accountId, db);
    await db.query('COMMIT');
    return result;
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
