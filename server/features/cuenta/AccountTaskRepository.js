import { randomUUID } from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
import { accountTaskTypes, canManageAccountTasks } from '../../../app/config/accountTasks.js';
import { requireTaskIdentity } from '../laboral/TaskAccess.js';
import { addCuentaEvento } from '../registroEventos/RegistroEventosRepository.js';
import { getUserEventContext } from '../userEvents/EventContext.js';
import { defaultAnnualRange, defaultRenewalMonth, normalizeAnnualRange, normalizeAnnualDayMonth } from '../../../app/lib/annualRenewalDates.js';

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
const renewalTask = { nombre: 'Enviar propuesta de renovación anual', tipo: 'propuesta_renovacion', estado: 'pendiente', agentes: [] };

async function renewalAssignees(db, account, changedField) {
  const email = String(account.asignado_a || '').trim();
  const id = String(account.id_agente || '').trim();
  const byEmail = changedField !== 'id_agente' && Boolean(email);
  const value = byEmail ? email : id;
  if (!value) return [];
  const { rows } = await db.query(`SELECT id_agente FROM agentes_db
    WHERE ${byEmail ? "lower(btrim(email_agente))=lower($1)" : "id_agente=$1"}
    AND COALESCE(is_empleado_account,true)
    AND lower(COALESCE(estado_agente,'')) NOT IN ('inactivo','borrador')
    ORDER BY id_agente LIMIT 2 FOR KEY SHARE`, [value]);
  return rows.length === 1 ? [rows[0].id_agente] : [];
}

export async function syncRenewalAssignee(db, account, changedField) {
  if (account.renovacion_anual?.activo === false) return;
  const task = (await db.query(`SELECT id FROM comercial_cuenta_tareas
    WHERE id_cuenta=$1 AND es_renovacion_anual FOR UPDATE`, [account.id_cuenta])).rows[0];
  const agents = await renewalAssignees(db, account, changedField);
  if (!task) {
    if (agents.length) {
      const context = await getUserEventContext();
      await writeAccountTask(db, { id: context?.actorId || '' }, account.id_cuenta, null,
        { ...renewalTask, agentes: agents }, false, true);
    }
    return;
  }
  const current = (await db.query('SELECT id_agente FROM comercial_cuenta_tarea_agentes WHERE id_tarea=$1', [task.id])).rows;
  if (current.length === agents.length && current[0]?.id_agente === agents[0]) return;
  await db.query('DELETE FROM comercial_cuenta_tarea_agentes WHERE id_tarea=$1', [task.id]);
  if (agents.length) await db.query('INSERT INTO comercial_cuenta_tarea_agentes(id_tarea,id_agente) VALUES($1,$2)', [task.id, agents[0]]);
  await db.query("UPDATE comercial_cuenta_tareas SET updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 millisecond') WHERE id=$1", [task.id]);
}

function validate(body, annual) {
  const nombre = String(body.nombre || '').trim(), descripcion = String(body.descripcion || '').trim(), referencia = String(body.referencia || '').trim();
  if (!nombre || nombre.length > 250 || descripcion.length > 10000 || referencia.length > 500) fail('Revisa el nombre, la descripción y la referencia de la tarea.');
  if (!Object.hasOwn(accountTaskTypes, body.tipo)) fail('Selecciona un tipo de tarea válido.');
  if (!states.includes(body.estado)) fail('Selecciona un estado válido.');
  if (!Array.isArray(body.agentes) || body.agentes.some(id => typeof id !== 'string' || !id.trim())) fail('Selecciona agentes válidos.');
  if (annual ? body.agentes.length > 1 : body.agentes.length === 0) {
    fail(annual ? 'Asigna como máximo un agente de seguimiento.' : 'Asigna la tarea al menos a un agente.');
  }
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
    await lockAccount(db, accountId);
    const result = await writeAccountTask(db, actor, accountId, id, body, statusOnly);
    await db.query('COMMIT');
    return result;
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}

async function lockAccount(db, accountId) {
  if (!(await db.query('SELECT 1 FROM comercial_cuentas WHERE id_cuenta=$1 FOR UPDATE', [accountId])).rowCount) fail('Cuenta no encontrada.', 404);
}

async function writeAccountTask(db, actor, accountId, id, body, statusOnly, createAnnual = false) {
  const previous = id ? (await db.query("SELECT *,to_char(fecha_limite,'YYYY-MM-DD') fecha_limite FROM comercial_cuenta_tareas WHERE id=$1 AND id_cuenta=$2 FOR UPDATE", [id, accountId])).rows[0] : null;
  if (id && !previous) fail('Tarea no encontrada.', 404);
  if (previous && (!body.version || new Date(body.version).getTime() !== new Date(previous.updated_at).getTime())) fail('La tarea ha cambiado. Recarga antes de guardar.', 409);
  const assigned = previous ? (await db.query('SELECT id_agente FROM comercial_cuenta_tarea_agentes WHERE id_tarea=$1', [id])).rows.map(a => a.id_agente) : [];
  if (statusOnly && !canManageAccountTasks(actor.role) && !assigned.includes(actor.id)) fail('No tienes acceso a esta tarea.', 403);
  const annual = createAnnual || Boolean(previous?.es_renovacion_anual);
  const input = statusOnly ? { ...previous, agentes: assigned, estado: body.estado } : { ...body, estado: body.estado || 'pendiente' };
  if (annual) input.tipo = renewalTask.tipo;
  const data = validate(input, annual);
  const campaign = statusOnly || body.id_campana === undefined ? previous?.id_campana ?? null : body.id_campana || null;
  if (campaign && campaign !== previous?.id_campana && !(await db.query('SELECT 1 FROM comercial_campanas WHERE id=$1 FOR KEY SHARE', [campaign])).rowCount) {
    fail('Selecciona una campaña comercial válida.');
  }
  const comments=String(body.comentarios_agente??previous?.comentarios_agente??'');
  if(comments.length>50000)fail('El comentario es demasiado largo.');
  const changeAssignments = !statusOnly && (!annual || data.agentes[0] !== assigned[0]);
  if (changeAssignments) {
    const valid = (await db.query(`SELECT id_agente FROM agentes_db WHERE id_agente=ANY($1::text[])
      AND COALESCE(is_empleado_account,true) AND lower(COALESCE(estado_agente,'')) NOT IN ('inactivo','borrador') FOR KEY SHARE`, [data.agentes])).rows;
    if (valid.length !== data.agentes.length) fail('Selecciona agentes activos con cuenta de empleado.');
  }
  const taskId = id || `cta_${randomUUID()}`;
  if (previous) await db.query(`UPDATE comercial_cuenta_tareas SET nombre=$2,tipo=$3,descripcion=$4,referencia=$5,fecha_limite=$6,estado=$7,id_campana=$8,
    updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 millisecond') WHERE id=$1`, [taskId,data.nombre,data.tipo,data.descripcion,data.referencia,data.fecha_limite,data.estado,campaign]);
  else await db.query('INSERT INTO comercial_cuenta_tareas(id,id_cuenta,nombre,tipo,descripcion,referencia,fecha_limite,estado,es_renovacion_anual,id_campana) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [taskId,accountId,data.nombre,data.tipo,data.descripcion,data.referencia,data.fecha_limite,data.estado,annual,campaign]);
  if(comments!==(previous?.comentarios_agente||''))await db.query('UPDATE comercial_cuenta_tareas SET comentarios_agente=$2 WHERE id=$1',[taskId,comments]);
  if (changeAssignments) {
    await db.query('DELETE FROM comercial_cuenta_tarea_agentes WHERE id_tarea=$1', [taskId]);
    for (const agent of data.agentes) await db.query('INSERT INTO comercial_cuenta_tarea_agentes(id_tarea,id_agente) VALUES($1,$2)', [taskId,agent]);
  }
  await addCuentaEvento({ idCuenta: accountId, idAgente: actor.id, detalles: `${previous ? 'Actualizada' : 'Creada'} tarea ${data.nombre}; estado ${data.estado}; agentes ${data.agentes.join(', ')}.`, eventType: 'Cambio por agente' }, db);
  return readAccountTask(actor, taskId, accountId, db);
}

export async function readAnnualRenewal(actor, accountId, db = getPgPool()) {
  const { tarea, ...state } = await loadAnnualRenewal(actor, accountId, db);
  return { ...state, tarea: state.activo ? tarea : null };
}

async function loadAnnualRenewal(actor, accountId, db) {
  requireTaskIdentity(actor);
  const account = (await db.query(`SELECT c.renovacion_anual,
    c.datos_comerciales->'envio_propuestas_anuales' AS rango_anterior,
    ARRAY(SELECT ct.fecha_firma_contrato FROM comercial_contratos ct
      JOIN comercial_propuestas_db p ON p.id_propuesta=ct.id_propuesta
      WHERE ct.id_cuenta_contrato=c.id_cuenta AND p.id_cuenta_propuesta=c.id_cuenta
        AND ct.es_prueba=c.es_prueba AND p.es_prueba=c.es_prueba) AS firmas
    FROM comercial_cuentas c WHERE c.id_cuenta=$1`, [accountId])).rows[0];
  if (!account) fail('Cuenta no encontrada.', 404);
  const activo = account.renovacion_anual?.activo !== false;
  const predeterminado = defaultAnnualRange(account.firmas);
  const fechaPredeterminada = defaultRenewalMonth(account.firmas);
  const legacyMonth = normalizeAnnualDayMonth((account.renovacion_anual?.rango || account.rango_anterior)?.entre)?.slice(3);
  const fechaManual = account.renovacion_anual?.fecha_aproximada || (legacyMonth ? fechaPredeterminada.slice(0,4) + '-' + legacyMonth : null);
  const rangoManual = fechaManual ? { entre: '01/' + fechaManual.slice(5), hasta: '15/' + fechaManual.slice(5) } : null;
  const task = (await db.query(`${select} WHERE t.id_cuenta=$1 AND t.es_renovacion_anual`, [accountId])).rows[0];
  return {
    activo, predeterminado, rango: activo ? rangoManual || predeterminado : null,
    fecha_predeterminada: fechaPredeterminada, fecha_aproximada: activo ? fechaManual || fechaPredeterminada : null,
    rango_manual: Boolean(rangoManual), tarea: task ? decorate(task, actor) : null,
    puede_editar: canManageAccountTasks(actor.role),
  };
}

export async function saveAnnualRenewal(actor, accountId, body, pool = getPgPool()) {
  requireTaskIdentity(actor);
  if (!canManageAccountTasks(actor.role)) fail('No tienes permisos para gestionar este seguimiento.', 403);
  if (!body || typeof body !== 'object') fail('Revisa los datos del seguimiento.');
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    await lockAccount(db, accountId);
    const current = await loadAnnualRenewal(actor, accountId, db);
    if (body.tarea) {
      if (!current.activo) fail('Activa el seguimiento antes de editar la tarea.', 409);
      if ((body.tarea.id || null) !== (current.tarea?.id || null)) fail('La tarea ha cambiado. Recarga antes de guardar.', 409);
      await writeAccountTask(db, actor, accountId, current.tarea?.id, body.tarea, false, !current.tarea);
    } else {
      if (typeof body.activo !== 'boolean') fail('Indica si la cuenta está en seguimiento.');
      const rango = normalizeAnnualRange(body.rango);
      const fecha = body.fecha_aproximada ?? (rango ? current.fecha_predeterminada.slice(0,4) + '-' + rango.entre.slice(3) : null);
      if (body.activo && ((fecha !== null && !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(fecha)) || (body.rango != null && !rango))) fail('Introduce un mes y año válidos.');
      await db.query('UPDATE comercial_cuentas SET renovacion_anual=$2::jsonb WHERE id_cuenta=$1',
        [accountId, JSON.stringify({ activo: body.activo, fecha_aproximada: body.activo ? fecha : null })]);
      if (body.activo && !current.tarea) {
        const account = (await db.query('SELECT id_agente,asignado_a FROM comercial_cuentas WHERE id_cuenta=$1', [accountId])).rows[0];
        await writeAccountTask(db, actor, accountId, null, { ...renewalTask, agentes: await renewalAssignees(db, account) }, false, true);
      }
      if (!body.activo && current.tarea) {
        await db.query('DELETE FROM comercial_cuenta_tareas WHERE id=$1', [current.tarea.id]);
        await addCuentaEvento({ idCuenta: accountId, idAgente: actor.id, detalles: 'Eliminada la tarea de renovación anual al desactivar el seguimiento.', eventType: 'Cambio por agente' }, db);
      }
    }
    const result = await readAnnualRenewal(actor, accountId, db);
    await db.query('COMMIT');
    return result;
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
