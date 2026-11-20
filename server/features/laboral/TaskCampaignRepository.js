import { getPgPool } from '../../database/pgClient.js';
import { canManageAccountTasks } from '../../../app/config/accountTasks.js';
import { managesTasks, requireTaskIdentity } from './TaskAccess.js';
import { readTasks } from './TaskRepository.js';

export async function taskCampaignLinks(actor, id, action, input = {}) {
  requireTaskIdentity(actor);
  const task = await readTasks(actor, { id });
  const account = task.origen === 'cuenta';
  const column = account ? 'id_tarea_cuenta' : 'id_tarea_empleado';
  const table = account ? 'comercial_cuenta_tareas' : 'laboral_tareas_empleado';
  const editable = account ? canManageAccountTasks(actor.role) : managesTasks(actor.role) || task.agente_creacion === actor.id;
  const db = await getPgPool().connect();
  try {
    await db.query('BEGIN');
    if (action !== 'GET') {
      if (!editable) throw Object.assign(new Error('No tienes permiso para gestionar asociaciones.'), { status: 403 });
      const { campaign, previous } = input;
      if ((action !== 'DELETE' && !campaign) || (action === 'DELETE' && !previous)) {
        throw Object.assign(new Error('Selecciona una campaña.'), { status: 400 });
      }
      await db.query(`SELECT id FROM ${table} WHERE id=$1 FOR UPDATE`, [id]);
      if (previous && previous !== campaign) {
        await db.query(`DELETE FROM comercial_campana_tareas WHERE ${column}=$1 AND id_campana=$2`, [id, previous]);
        await db.query(`UPDATE ${table} SET id_campana=NULL,updated_at=now() WHERE id=$1 AND id_campana=$2`, [id, previous]);
      }
      if (action !== 'DELETE') {
        if (!(await db.query('SELECT id FROM comercial_campanas WHERE id=$1 FOR KEY SHARE', [campaign])).rowCount) {
          throw Object.assign(new Error('Campaña no encontrada.'), { status: 404 });
        }
        await db.query(`INSERT INTO comercial_campana_tareas(id_campana,${column})
          SELECT $2,$1 WHERE NOT EXISTS (SELECT 1 FROM ${table} WHERE id=$1 AND id_campana=$2)
          ON CONFLICT DO NOTHING`, [id, campaign]);
      }
    }
    const { rows } = await db.query(`SELECT c.id,c.nombre FROM comercial_campanas c JOIN (
      SELECT id_campana FROM comercial_campana_tareas WHERE ${column}=$1
      UNION SELECT id_campana FROM ${table} WHERE id=$1
    ) links ON links.id_campana=c.id ORDER BY c.nombre,c.id`, [id]);
    const current = (await db.query(`SELECT id_campana,updated_at FROM ${table} WHERE id=$1`, [id])).rows[0];
    await db.query('COMMIT');
    return { rows, editable, ...current };
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { db.release(); }
}
