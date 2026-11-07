import fs from 'node:fs/promises';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {withUserEventContext} from '../server/features/userEvents/EventContext.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
try{await withUserEventContext({enabled:true,method:'POST',route:'maintenance/production-workflow-20261107',actorName:'Migración producción y tareas',actorId:null,ip:null,ipSource:'maintenance'},async()=>{
 await db.query('BEGIN');
 const before=(await db.query('SELECT id_contenido FROM produccion_contenidos ORDER BY id_contenido')).rows;
 await db.query(await fs.readFile(new URL('../database/migrations/20261107_0001_production_workflow_and_tasks.sql',import.meta.url),'utf8'));
 const after=(await db.query('SELECT id_contenido FROM produccion_contenidos ORDER BY id_contenido')).rows;
 if(JSON.stringify(before)!==JSON.stringify(after))throw Error('La migración ha modificado los identificadores de contenido.');
 if((await db.query('SELECT e.id FROM produccion_control_redaccion e LEFT JOIN produccion_contenidos c ON c.articulo_origen_id=e.id WHERE c.id_contenido IS NULL')).rowCount)throw Error('Artículos sin trasladar');
 await db.query('COMMIT');console.log(`Migración aplicada; ${after.length} contenidos conservados; todos los artículos trasladados sin duplicados.`);
});}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await pool.end();}
