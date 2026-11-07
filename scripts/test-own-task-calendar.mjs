import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {withUserEventContext} from '../server/features/userEvents/EventContext.js';
import {createOwnTask,readTasks} from '../server/features/laboral/TaskRepository.js';
import {taskCalendarDay} from '../app/lib/myTaskCalendar.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),query=pool.query.bind(pool),requestId=randomUUID();let taskId;
try{
 const agents=(await db.query("SELECT id_agente FROM agentes_db WHERE estado_agente='activo' AND COALESCE(is_empleado_account,true) ORDER BY id_agente LIMIT 2")).rows;assert.equal(agents.length,2,'Se requieren dos agentes activos para esta prueba');
 const actor={id:agents[0].id_agente,role:'base'},other={id:agents[1].id_agente,role:'base'};
 await withUserEventContext({enabled:true,actorId:actor.id,actorName:'Prueba de tarea compartida',requestId,method:'POST',route:'maintenance/test-own-task-calendar',ip:null,ipSource:'prueba'},async()=>{
  await db.query('BEGIN');pool.query=(...args)=>db.query(...args);
  const task=await createOwnTask(actor,{nombre:'PRUEBA-calendario-'+requestId,descripcion:'Prueba temporal con rollback',fecha_inicio:'16/11/2026',agentes_asociados:[other.id],agente:other.id,agente_creacion:'falso'});taskId=task.id;
  assert.equal(task.agente,actor.id);assert.equal(task.agente_creacion,actor.id);assert.deepEqual(task.agentes_asociados,[actor.id,other.id]);
  for(const responsible of [actor,other]){const row=await readTasks(responsible,{id:task.id});assert.equal(taskCalendarDay(row),'2026-11-16');assert((await readTasks(responsible)).some(item=>item.id===task.id));}
  const event=(await db.query("SELECT id_usuario,datos_nuevos FROM eventos_de_usuarios WHERE id_solicitud=$1 AND tabla='laboral_tareas_empleado' AND datos_nuevos->>'id'=$2",[requestId,task.id])).rows[0];
  assert(event);assert.equal(event.id_usuario,actor.id);assert.deepEqual(event.datos_nuevos.agentes_asociados,[actor.id,other.id]);assert(event.datos_nuevos.fecha_inicio.startsWith('2026-11-16'));
  await db.query('ROLLBACK');
 });
 assert.equal((await db.query('SELECT 1 FROM laboral_tareas_empleado WHERE id=$1',[taskId])).rowCount,0);assert.equal((await db.query('SELECT 1 FROM eventos_de_usuarios WHERE id_solicitud=$1',[requestId])).rowCount,0);
 console.log('PASS: tarea única compartida, fecha en ambos calendarios, autor autenticado, auditoría de fecha/responsables y rollback sin datos permanentes.');
}catch(e){await db.query('ROLLBACK');throw e;}finally{pool.query=query;db.release();await pool.end();}
