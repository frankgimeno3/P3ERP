import fs from 'node:fs/promises';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {inferTaskAgents} from '../app/config/taskAssignments.js';
env.loadEnvConfig(process.cwd());
const p=getPgPool(),db=await p.connect();
try{
 await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'");
 const tasks=(await db.query('SELECT * FROM laboral_tareas_empleado WHERE vtiger_original IS NOT NULL ORDER BY id FOR UPDATE')).rows;
 const agents=(await db.query('SELECT * FROM agentes_db ORDER BY id_agente')).rows;
 const folders=(await db.query('SELECT * FROM mediateca_carpetas')).rows;
 const backup='C:/Users/frank/Downloads/p3erp-identificadores-20261009/task-assignments-before-'+Date.now()+'.json';
 await fs.writeFile(backup,JSON.stringify({tasks,agents,folders},null,2),{flag:'wx'});
 const sql=(await fs.readFile('database/migrations/20261010_0003_task_assignments_mediateca_roles.sql','utf8')).replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');await db.query(sql);
 const ricardo=agents.find(a=>a.nombre_completo_agente.startsWith('Ricardo Calleja'));if(!ricardo)throw new Error('Ricardo no encontrado');
 if(agents.some(a=>a.id_agente!==ricardo.id_agente&&String(a.email_agente||'').toLowerCase()==='redaccion@vidrioperfil.com'))throw new Error('El correo ya pertenece a otro agente');
 await db.query("UPDATE agentes_db SET email_agente='redaccion@vidrioperfil.com',updated_at=now() WHERE id_agente=$1",[ricardo.id_agente]);ricardo.email_agente='redaccion@vidrioperfil.com';
 const groups={},pending=[],plan=[];
 for(const task of tasks){
  if(task.agente||(task.agentes_asociados||[]).length)continue;
  const source=task.vtiger_original['Asignado a'],ids=inferTaskAgents(source,agents);
  if(!ids.length){pending.push({id:task.id,nombre:task.nombre,source});continue;}
  plan.push({id:task.id,agente:ids[0],agentes_asociados:ids});
  groups[source]=(groups[source]||0)+1;
 }
 await db.query(`UPDATE laboral_tareas_empleado t SET agente=x.agente,agentes_asociados=x.agentes_asociados,updated_at=now() FROM jsonb_to_recordset($1::jsonb) x(id text,agente text,agentes_asociados jsonb) WHERE t.id=x.id AND t.agente IS NULL`,[JSON.stringify(plan)]);
 await db.query('COMMIT');console.log(JSON.stringify({groups,pending,email:ricardo.email_agente,backup}));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await p.end();}
