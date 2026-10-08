import {readFile} from 'node:fs/promises';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {importVtigerTasks,prepareVtigerTasks} from '../server/features/laboral/VtigerTaskRepository.js';
env.loadEnvConfig(process.cwd());
const argument=name=>process.argv[process.argv.indexOf(name)+1];
if(!process.argv.includes('--file')||!process.argv.includes('--actor'))throw new Error('Indica --file <CSV> y --actor <id_agente>. Añade --apply para importar.');
const pool=getPgPool();
try{
 const agent=(await pool.query('SELECT id_agente,rol_agente FROM agentes_db WHERE id_agente=$1',[argument('--actor')])).rows[0];
 if(!agent)throw new Error('Agente no encontrado.');
 const csv=await readFile(argument('--file'),'utf8'),actor={id:agent.id_agente,role:agent.rol_agente};
 const summary=await importVtigerTasks(actor,{csv,agents:{},accounts:{}},process.argv.includes('--apply'));
 console.log(JSON.stringify(summary,null,2));
 if(process.argv.includes('--apply')){
   const tasks=prepareVtigerTasks(csv),stored=(await pool.query('SELECT importacion_clave,vtiger_original FROM laboral_tareas_empleado WHERE importacion_clave=ANY($1::text[])',[tasks.map(task=>task.key)])).rows;
   const byKey=new Map(stored.map(task=>[task.importacion_clave,task.vtiger_original]));
   if(tasks.some(task=>JSON.stringify(Object.entries(task.raw).sort())!==JSON.stringify(Object.entries(byKey.get(task.key)||{}).sort())))throw new Error('La comprobación de campos originales no coincide.');
   console.log(`Verificadas ${stored.length} tareas con todos sus campos originales.`);
 }
}finally{await pool.end();}
