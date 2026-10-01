import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import env from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';
import { registerSignedContract, getSignedContract } from '../server/features/contrato/SignedContract.js';

env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),schema='test_signed_'+randomUUID().replaceAll('-','');
const connect=pool.connect.bind(pool),query=pool.query.bind(pool);
try {
  await db.query('CREATE SCHEMA '+schema);
  await db.query('SET search_path TO '+schema+',public');
  for(const name of ['agentes_db','comercial_contratos','mediateca_carpetas','mediateca_archivos'])
    await db.query(`CREATE TABLE ${schema}.${name} (LIKE public.${name} INCLUDING ALL)`);
  await db.query("INSERT INTO agentes_db(id_agente,is_empleado_account) VALUES('agent_test',true)");
  await db.query("INSERT INTO comercial_contratos(id_contrato,id_agente_contrato,fecha_firma_contrato) VALUES('cont_26_0001','agent_test','18/09/2026')");
  pool.connect=async()=>({query:(...args)=>db.query(...args),release(){}});
  pool.query=(...args)=>db.query(...args);
  const mediaId=randomUUID();
  const key=`mediateca/contratos_firmados/agent_test/2026/${mediaId}/cont_26_0001.pdf`;
  const saved=await registerSignedContract('cont_26_0001',{contentType:'application/pdf',mediaId,s3Key:key},async()=>{});
  assert.equal(saved.uploaded,true);
  assert.equal((await getSignedContract('cont_26_0001')).mediaId,mediaId);
  const folders=(await db.query('SELECT mediateca_folder_name FROM mediateca_carpetas ORDER BY mediateca_folder_name')).rows.map(row=>row.mediateca_folder_name);
  assert.deepEqual(folders,['2026','agent_test','contratos_firmados']);
  assert.equal((await db.query('SELECT mediateca_content_name FROM mediateca_archivos WHERE mediateca_content_id=$1',[mediaId])).rows[0].mediateca_content_name,'cont_26_0001');
  console.log('PASS: contrato firmado vinculado a RDS y a su carpeta agente/año');
} finally {
  pool.connect=connect;pool.query=query;
  await db.query('SET search_path TO public');
  await db.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');
  db.release();await pool.end();
}
