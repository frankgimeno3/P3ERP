import { randomUUID } from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
import { requireTaskIdentity } from '../laboral/TaskAccess.js';
import { saveAgentTask } from '../laboral/EmployeePayrollRepository.js';
import { canManageAccountTasks } from '../../../app/config/accountTasks.js';

const statuses = ['pendiente', 'en_curso', 'finalizada'];
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };

export async function commercialCampaigns(actor, { id, accountId } = {}, db = getPgPool()) {
  requireTaskIdentity(actor);
  const { rows } = await db.query(`
    SELECT c.id, c.nombre, c.descripcion, c.estado, c.updated_at,
      to_char(c.created_at AT TIME ZONE 'Europe/Madrid','DD/MM/YYYY') fecha_creacion,
      to_char(c.fecha_finalizacion,'DD/MM/YYYY') fecha_finalizacion,
      COALESCE(NULLIF(a.nombre_completo_agente,''), a.id_agente) creada_por,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('id', ca.id_agente, 'nombre', COALESCE(NULLIF(ag.nombre_completo_agente,''),ag.id_agente)) ORDER BY ag.nombre_completo_agente)
                FROM comercial_campana_agentes ca JOIN agentes_db ag USING(id_agente) WHERE ca.id_campana=c.id),'[]') agentes,
      CASE WHEN $1::text IS NOT NULL THEN COALESCE((SELECT jsonb_agg(jsonb_build_object('id', cc.id_cuenta, 'nombre', acc.nombre_empresa) ORDER BY acc.nombre_empresa)
                FROM comercial_campana_cuentas cc JOIN comercial_cuentas acc USING(id_cuenta) WHERE cc.id_campana=c.id),'[]') ELSE '[]'::jsonb END cuentas,
      CASE WHEN $1::text IS NOT NULL THEN COALESCE((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'nombre', t.nombre, 'estado', t.estado, 'id_cuenta', t.id_cuenta) ORDER BY t.nombre,t.id)
                FROM (
                  SELECT id,nombre,estado,id_cuenta FROM comercial_cuenta_tareas WHERE id_campana=c.id
                  UNION ALL SELECT id,nombre,estado,id_cuenta FROM laboral_tareas_empleado WHERE id_campana=c.id
                ) t),'[]') ELSE '[]'::jsonb END tareas
    FROM comercial_campanas c JOIN agentes_db a ON a.id_agente=c.creada_por
    WHERE ($1::text IS NULL OR c.id=$1)
      AND ($2::text IS NULL OR EXISTS(SELECT 1 FROM comercial_campana_cuentas WHERE id_campana=c.id AND id_cuenta=$2))
    ORDER BY c.created_at DESC, c.id`, [id || null, accountId || null]);
  if (id && !rows.length) fail('Campaña no encontrada.', 404);
  return id ? rows[0] : rows;
}

export async function addCampaignTask(actor, id, input) {
  requireTaskIdentity(actor);
  if (!canManageAccountTasks(actor.role)) fail('No tienes permiso para gestionar campañas.', 403);
  const agent = input?.agente;
  if (typeof agent !== 'string' || !(await getPgPool().query(`SELECT 1 FROM agentes_db WHERE id_agente=$1
    AND COALESCE(is_empleado_account,true) AND lower(COALESCE(estado_agente,'')) NOT IN ('inactivo','borrador')`, [agent])).rowCount) fail('Selecciona un agente empleado activo.');
  return saveAgentTask(null, { nombre: input.nombre, agente: agent, estado: 'pendiente', id_campana: id });
}

function campaignDate(value) {
  if (!value) return null;
  const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!parts) fail('Introduce una fecha de finalización válida.');
  const iso = `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso || parts[3] === '0000') fail('Introduce una fecha de finalización válida.');
  return iso;
}

function ids(value) {
  if (!Array.isArray(value) || value.some(id => typeof id !== 'string' || !id.trim())) fail('Revisa las asociaciones de la campaña.');
  return [...new Set(value)];
}

export async function saveCommercialCampaign(actor, id, input, pool = getPgPool()) {
  requireTaskIdentity(actor);
  if (!canManageAccountTasks(actor.role)) fail('No tienes permiso para gestionar campañas.', 403);
  const nombre = String(input?.nombre || '').trim(), descripcion = String(input?.descripcion || '').trim();
  if (!nombre || nombre.length > 250 || descripcion.length > 20000 || !statuses.includes(input.estado)) fail('Revisa el nombre, la descripción y el estado.');
  const fecha = campaignDate(input.fecha_finalizacion);
  const agentes = ids(input.agentes), cuentas = ids(input.cuentas);
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const campaignId = id || `camp_${randomUUID()}`;
    if (id) {
      const updated = await db.query(`UPDATE comercial_campanas SET nombre=$2,descripcion=$3,fecha_finalizacion=$4,estado=$5,
        updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 millisecond') WHERE id=$1 AND date_trunc('milliseconds', updated_at)=$6::timestamptz`,
      [id,nombre,descripcion,fecha,input.estado,input.version || null]);
      if (!updated.rowCount) fail('La campaña ha cambiado. Recarga antes de guardar.', 409);
    } else {
      await db.query('INSERT INTO comercial_campanas(id,nombre,descripcion,fecha_finalizacion,estado,creada_por) VALUES($1,$2,$3,$4,$5,$6)',[campaignId,nombre,descripcion,fecha,input.estado,actor.id]);
    }
    for (const [table, column, values] of [
      ['comercial_campana_agentes','id_agente',agentes],
      ['comercial_campana_cuentas','id_cuenta',cuentas],
    ]) {
      await db.query(`DELETE FROM ${table} WHERE id_campana=$1 AND NOT (${column}=ANY($2::text[]))`,[campaignId,values]);
      await db.query(`INSERT INTO ${table}(id_campana,${column}) SELECT $1, unnest($2::text[]) ON CONFLICT DO NOTHING`,[campaignId,values]);
    }
    const result = await commercialCampaigns(actor,{id:campaignId},db);
    await db.query('COMMIT');
    return result;
  } catch (error) {
    await db.query('ROLLBACK');
    if (error.code === '23503') fail('Alguna cuenta o agente ya no existe.');
    throw error;
  } finally { db.release(); }
}
