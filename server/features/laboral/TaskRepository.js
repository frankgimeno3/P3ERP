import {getPgPool} from '../../database/pgClient.js';
import {agentTasks,saveAgentTask} from './EmployeePayrollRepository.js';
import {managesTasks,requireTaskIdentity} from './TaskAccess.js';
import {accountTasks,readAccountTask} from '../cuenta/AccountTaskRepository.js';
export async function createOwnTask(actor,body){
  requireTaskIdentity(actor);
  if(!(await getPgPool().query('SELECT 1 FROM agentes_db WHERE id_agente=$1',[actor.id])).rowCount)throw Object.assign(new Error('Agente no encontrado.'),{status:403});
  return saveAgentTask(null,{nombre:body.nombre,descripcion:body.descripcion,agente:actor.id,estado:'pendiente'});
}
export async function readTasks(actor,{id,employee}={}) {
  requireTaskIdentity(actor);
  if(id?.startsWith('cta_'))return readAccountTask(actor,id,undefined,getPgPool(),true);
  if(id){const task=await agentTasks(id);if(task.agente!==actor.id&&!managesTasks(actor.role))throw Object.assign(new Error('No tienes acceso a esta tarea.'),{status:403});return task;}
  if(employee&&employee!==actor.id)requireTaskIdentity(actor,true);
  return [...await agentTasks(null,employee||actor.id),...await accountTasks(actor,{employee:employee||actor.id})];
}
export async function taskEmployees(actor) {
  requireTaskIdentity(actor,true);
  return (await getPgPool().query(`SELECT a.id_agente,COALESCE(NULLIF(a.nombre_completo_agente,''),NULLIF(a.nombre_agente,''),a.id_agente) nombre,
    (count(t.id) FILTER (WHERE t.estado IN ('pendiente','en_curso')) +
      (SELECT count(*) FROM comercial_cuenta_tarea_agentes ca JOIN comercial_cuenta_tareas ct ON ct.id=ca.id_tarea WHERE ca.id_agente=a.id_agente AND ct.estado IN ('pendiente','en_curso')))::int pendientes,
    (count(t.id) FILTER (WHERE t.estado IN ('completada','cancelada')) +
      (SELECT count(*) FROM comercial_cuenta_tarea_agentes ca JOIN comercial_cuenta_tareas ct ON ct.id=ca.id_tarea WHERE ca.id_agente=a.id_agente AND ct.estado IN ('completada','cancelada')))::int terminadas
    FROM agentes_db a LEFT JOIN laboral_tareas_empleado t ON t.agente=a.id_agente
    WHERE COALESCE(a.is_empleado_account,true) OR EXISTS(SELECT 1 FROM laboral_tareas_empleado x WHERE x.agente=a.id_agente AND x.vtiger_original IS NOT NULL) GROUP BY a.id_agente ORDER BY nombre,a.id_agente`)).rows;
}
export async function taskCalendar(actor) {
  requireTaskIdentity(actor,true);
  return [...await agentTasks(),...await accountTasks(actor)].map(task=>({
    id:task.id,nombre:task.nombre,estado:task.estado,agente:task.agente,
    nombre_agente:task.nombre_agente,nombre_cuenta:task.nombre_cuenta,
    fecha_inicio:task.fecha_inicio,fecha_fin:task.fecha_fin,fecha_limite:task.fecha_limite,
    vtiger_original:task.vtiger_original?{'Asignado a':task.vtiger_original['Asignado a'],'En relación con':task.vtiger_original['En relación con']}:null
  }));
}
export async function writeTask(actor,id,body){
  requireTaskIdentity(actor,true);
  if(id?.startsWith('tarea_vtiger_')){
    if(!body.updated_at)throw Object.assign(new Error('Recarga la tarea antes de guardar.'),{status:409});
    if(!String(body.nombre||'').trim() || String(body.nombre).length>250 || !['pendiente','en_curso','completada','cancelada'].includes(body.estado))throw Object.assign(new Error('Revisa el nombre y el estado.'),{status:400});
    return (await getPgPool().query("UPDATE laboral_tareas_empleado SET nombre=$2,descripcion=$3,estado=$4,updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 millisecond') WHERE id=$1 AND date_trunc('milliseconds',updated_at)=$5::timestamptz RETURNING *",[id,body.nombre.trim(),String(body.descripcion||''),body.estado,body.updated_at])).rows[0] || (()=>{throw Object.assign(new Error('La tarea ha cambiado. Recarga antes de guardar.'),{status:409});})();
  }
  if(!(await getPgPool().query('SELECT 1 FROM agentes_db WHERE id_agente=$1 AND COALESCE(is_empleado_account,true)',[body.agente])).rowCount)throw Object.assign(new Error('Selecciona un agente empleado.'),{status:400});
  return saveAgentTask(id,body);
}
