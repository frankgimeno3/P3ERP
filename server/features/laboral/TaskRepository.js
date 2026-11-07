import {getPgPool} from '../../database/pgClient.js';
import {agentTasks,saveAgentTask} from './EmployeePayrollRepository.js';
import {managesTasks,requireTaskIdentity} from './TaskAccess.js';
import {accountTasks,readAccountTask} from '../cuenta/AccountTaskRepository.js';
import {taskAgentIds} from '../../../app/config/taskAssignments.js';
export async function createOwnTask(actor,body){
  requireTaskIdentity(actor);
  if(!(await getPgPool().query('SELECT 1 FROM agentes_db WHERE id_agente=$1',[actor.id])).rowCount)throw Object.assign(new Error('Agente no encontrado.'),{status:403});
  return saveAgentTask(null,{nombre:body.nombre,descripcion:body.descripcion,id_cuenta:body.id_cuenta,agente:actor.id,estado:'pendiente'});
}
export async function readTasks(actor,{id,employee}={}) {
  requireTaskIdentity(actor);
  if(id?.startsWith('cta_'))return readAccountTask(actor,id,undefined,getPgPool(),true);
  if(id){const task=await agentTasks(id);if(!taskAgentIds(task).includes(actor.id)&&!managesTasks(actor.role))throw Object.assign(new Error('No tienes acceso a esta tarea.'),{status:403});return {...task,puede_editar:managesTasks(actor.role),puede_cambiar_estado:true,puede_asociar_cuenta:managesTasks(actor.role)||task.agente_creacion===actor.id};}
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
    FROM agentes_db a LEFT JOIN laboral_tareas_empleado t ON t.agente=a.id_agente OR t.agentes_asociados ? a.id_agente
    WHERE COALESCE(a.is_empleado_account,true) OR EXISTS(SELECT 1 FROM laboral_tareas_empleado x WHERE (x.agente=a.id_agente OR x.agentes_asociados ? a.id_agente) AND x.vtiger_original IS NOT NULL) GROUP BY a.id_agente ORDER BY nombre,a.id_agente`)).rows;
}
export async function taskCalendar(actor) {
  requireTaskIdentity(actor,true);
  return [...await agentTasks(),...await accountTasks(actor)].map(task=>({
    id:task.id,nombre:task.nombre,estado:task.estado,agente:task.agente,agentes:taskAgentIds(task),
    nombre_agente:task.nombre_agente,nombre_cuenta:task.nombre_cuenta,
    fecha_inicio:task.fecha_inicio,fecha_fin:task.fecha_fin,fecha_limite:task.fecha_limite,
    vtiger_original:task.vtiger_original?{'Asignado a':task.vtiger_original['Asignado a'],'En relación con':task.vtiger_original['En relación con']}:null
  }));
}
export async function writeTask(actor,id,body){
 requireTaskIdentity(actor);
 const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
 if(!id){
  requireTaskIdentity(actor,true);
  const ids=body.agentes_asociados||[body.agente];
  if(!Array.isArray(ids)||!ids.length||ids.some(value=>typeof value!=='string'||!value))fail('Selecciona agentes válidos.');
  const unique=[...new Set(ids)];
  if((await getPgPool().query('SELECT 1 FROM agentes_db WHERE id_agente=ANY($1::text[]) AND COALESCE(is_empleado_account,true)',[unique])).rowCount!==unique.length)fail('Selecciona agentes empleados válidos.');
  return saveAgentTask(null,{...body,agente:unique[0],agentes_asociados:unique});
 }
 const db=await getPgPool().connect();
 try{
  await db.query('BEGIN');
  const old=(await db.query('SELECT * FROM laboral_tareas_empleado WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!old)fail('Tarea no encontrada.',404);
  const manager=managesTasks(actor.role);
  if(!manager&&!taskAgentIds(old).includes(actor.id))fail('No tienes acceso a esta tarea.',403);
  if(!body.updated_at||new Date(body.updated_at).getTime()!==new Date(old.updated_at).getTime())fail('La tarea ha cambiado. Recarga antes de guardar.',409);
  const state=body.estado??old.estado,comments=String(body.comentarios_agente??old.comentarios_agente);
  if(!['pendiente','en_curso','completada','cancelada'].includes(state)||comments.length>50000)fail('Revisa el estado y los comentarios.');
  let ids=taskAgentIds(old),name=old.nombre,description=old.descripcion;
  if(manager){
   ids=Object.hasOwn(body,'agentes_asociados')?body.agentes_asociados:body.agente?[body.agente]:ids;
   if(!Array.isArray(ids)||ids.some(value=>typeof value!=='string'||!value))fail('Selecciona agentes válidos.');
   ids=[...new Set(ids)];
   if(!ids.length&&!id.startsWith('tarea_vtiger_'))fail('Asigna al menos un agente.');
   const valid=(await db.query('SELECT id_agente FROM agentes_db WHERE id_agente=ANY($1::text[]) AND COALESCE(is_empleado_account,true)',[ids])).rowCount;
   if(valid!==ids.length)fail('Selecciona agentes empleados válidos.');
   name=String(body.nombre??name).trim();description=String(body.descripcion??description);
   if(!name||name.length>250||description.length>50000)fail('Revisa nombre y descripción.');
  }
  const account=manager||old.agente_creacion===actor.id?(body.id_cuenta??old.id_cuenta):old.id_cuenta;
  if(account&&!(await db.query('SELECT 1 FROM comercial_cuentas WHERE id_cuenta=$1 FOR KEY SHARE',[account])).rowCount)fail('Cuenta no encontrada.');
  const result=(await db.query(`UPDATE laboral_tareas_empleado SET nombre=$2,descripcion=$3,estado=$4,comentarios_agente=$5,agente=$6,agentes_asociados=$7::jsonb,id_cuenta=$8,
   updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 millisecond') WHERE id=$1 RETURNING *`,[id,name,description,state,comments,ids[0]||null,JSON.stringify(ids),account||null])).rows[0];
  await db.query('COMMIT');return {...result,puede_editar:manager,puede_cambiar_estado:true,puede_asociar_cuenta:manager||old.agente_creacion===actor.id};
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
}
