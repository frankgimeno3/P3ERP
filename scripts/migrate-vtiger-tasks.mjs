import {readFile} from 'node:fs/promises';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
try{
  if(process.argv.includes('--apply')){
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout='3s'");
    await db.query("SET LOCAL statement_timeout='30s'");
    await db.query(await readFile(new URL('../database/migrations/20261008_0001_vtiger_tasks.sql',import.meta.url),'utf8'));
    await db.query('COMMIT');
  }
  const columns=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_name='laboral_tareas_empleado' AND column_name IN ('id_cuenta','fecha_inicio','fecha_fin','vtiger_original','importacion_clave')")).rows;
  console.log({installed:columns.length===5});
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
