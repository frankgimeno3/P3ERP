import {readFile} from 'node:fs/promises';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
try{
 if(process.argv.includes('--apply')){
  await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");await db.query("SET LOCAL statement_timeout='30s'");
  await db.query(await readFile(new URL('../database/migrations/20261006_0002_account_tasks.sql',import.meta.url),'utf8'));await db.query('COMMIT');
 }
 console.log({installed:!!(await db.query("SELECT to_regclass('public.comercial_cuenta_tareas') installed")).rows[0].installed});
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
