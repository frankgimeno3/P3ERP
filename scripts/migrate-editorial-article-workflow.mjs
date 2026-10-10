import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
try{
 const before=(await db.query('SELECT to_jsonb(r) value FROM produccion_control_redaccion r ORDER BY id')).rows;
 const path='C:/Users/frank/Downloads/p3erp-identificadores-20261009/articles-before-workflow-'+Date.now()+'.json';
 await fs.writeFile(path,JSON.stringify(before,null,2),{flag:'wx'});
 await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'");
 const sql=(await fs.readFile('database/migrations/20261010_0001_editorial_article_workflow.sql','utf8')).replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
 await db.query(sql);
 const after=(await db.query("SELECT to_jsonb(r)-'id_cuenta'-'pasado_produccion_dia'-'publicaciones_estado' value FROM produccion_control_redaccion r ORDER BY id")).rows;
 const original=before.map(r=>({value:Object.fromEntries(Object.entries(r.value).filter(([key])=>!['id_cuenta','pasado_produccion_dia','publicaciones_estado'].includes(key)))}));
 assert.deepEqual(after,original,'Existing editorial data changed');await db.query('COMMIT');
 console.log(JSON.stringify({articles:before.length,unchanged:true,backup:path}));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
