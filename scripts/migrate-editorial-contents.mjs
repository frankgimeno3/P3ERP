import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {ensureArticleContent} from '../server/features/controlRedaccion/ControlRedaccionRepository.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
try{
 await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'");
 await db.query("SELECT pg_advisory_xact_lock(hashtext('migrate_editorial_contents'))");
 const before=(await db.query('SELECT * FROM produccion_control_redaccion ORDER BY id FOR UPDATE')).rows;
 const backup='C:/Users/frank/Downloads/p3erp-identificadores-20261009/editorial-contents-before-'+Date.now()+'.json';
 const contracts=(await db.query('SELECT id_contrato,to_jsonb(c)->\'agregados_extra_post_contrato\' extras FROM comercial_contratos c ORDER BY id_contrato')).rows;
 await fs.writeFile(backup,JSON.stringify({articles:before,contracts},null,2),{flag:'wx'});
 const sql=(await fs.readFile('database/migrations/20261010_0002_editorial_contract_extras.sql','utf8')).replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'');
 await db.query(sql);
 let created=0,accounts=0;
 for(const article of before){
  if(!article.id_cuenta){
   const candidates=(await db.query('SELECT id_cuenta FROM comercial_cuentas WHERE lower(trim(nombre_empresa))=lower(trim($1))',[article.empresa])).rows;
   if(candidates.length===1){article.id_cuenta=candidates[0].id_cuenta;await db.query('UPDATE produccion_control_redaccion SET id_cuenta=$1 WHERE id=$2',[article.id_cuenta,article.id]);accounts++;}
  }
  const id=await ensureArticleContent(db,article);if(id!==article.id_contenido)created++;
 }
 const linked=(await db.query('SELECT count(*)::int n FROM produccion_control_redaccion e JOIN produccion_contenidos c USING(id_contenido)')).rows[0].n;
 assert.equal(linked,before.length);
 await db.query('COMMIT');console.log(JSON.stringify({articles:before.length,linked,created,accounts,backup}));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
