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
    WHERE COALESCE(a.is_empleado_account,true) GROUP BY a.id_agente ORDER BY nombre,a.id_agente`)).rows;
}
export async function writeTask(actor,id,body){
  requireTaskIdentity(actor,true);
  if(!(await getPgPool().query('SELECT 1 FROM agentes_db WHERE id_agente=$1 AND COALESCE(is_empleado_account,true)',[body.agente])).rowCount)throw Object.assign(new Error('Selecciona un agente empleado.'),{status:400});
  return saveAgentTask(id,body);
}
