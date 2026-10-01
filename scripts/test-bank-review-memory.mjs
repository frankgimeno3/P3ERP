// Integration tests use a private schema inside a transaction; all fixtures/DDL are rolled back.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import env from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';
import { getReviewAnalysis, changeReviewMemory, savePlannedReviewMemory, rememberDuplicateDiscard } from '../server/features/banco/BankReviewMemoryRepository.js';

env.loadEnvConfig(process.cwd());
const pool=getPgPool(), db=await pool.connect(), connect=pool.connect;
let depth=0;
const adapter={release(){},async query(sql,args){if(sql.startsWith('BEGIN'))return db.query(`SAVEPOINT memory_${++depth}`);if(sql==='COMMIT')return db.query(`RELEASE SAVEPOINT memory_${depth--}`);if(sql==='ROLLBACK'){await db.query(`ROLLBACK TO SAVEPOINT memory_${depth}`);return db.query(`RELEASE SAVEPOINT memory_${depth--}`);}return db.query(sql,args);}};
const ids=['first','second'];
try {
  await db.query('BEGIN');
  const schema=`bank_memory_test_${randomUUID().replaceAll('-','')}`;
  await db.query(`CREATE SCHEMA ${schema}`);
  await db.query(`SET LOCAL search_path TO ${schema}`);
  await db.query(`CREATE TABLE tesoreria_movimientos_bancarios(id_linea_banco text PRIMARY KEY,banco text DEFAULT 'Sabadell',fecha_operativa text,fecha_valor text,importe numeric,concepto text,id_proveedor text,id_agente text,id_cuenta text,id_cargo_recurrente bigint,duplicado_descartado boolean DEFAULT false,comentarios text,estado_revision boolean DEFAULT false,updated_at timestamptz DEFAULT now());
    CREATE TABLE tesoreria_cargos_recurrentes(id_cargo_recurrente bigint PRIMARY KEY,id_proveedor text,tipo_cargo text DEFAULT 'proveedor',tipo_programacion text,programacion jsonb,activo boolean DEFAULT true);`);
  const migration=fs.readFileSync('database/migrations/20260920_0001_bank_review_memory.sql','utf8');
  await db.query(migration);await db.query(migration);
  const schedule=[{id_regla:'monthly',cada:1,unidad:'meses',inicio_dia:1,inicio_mes:1,inicio_anio:2026,total_iva:50,descripcion:'Mantenimiento'}];
  await db.query("INSERT INTO tesoreria_cargos_recurrentes(id_cargo_recurrente,id_proveedor,tipo_programacion,programacion) VALUES(1,'supplier','periodicidad',$1),(2,'supplier','periodicidad',$1)",[JSON.stringify(schedule)]);
  await db.query("INSERT INTO tesoreria_movimientos_bancarios(id_linea_banco,fecha_operativa,fecha_valor,importe,concepto,id_proveedor,id_cargo_recurrente) VALUES('first','02/04/2026','02/04/2026',-50,'RECIBO comunidad local 154','supplier',1),('second','04/04/2026','04/04/2026',-50,'RECIBO comunidad local 154','supplier',2)");
  pool.connect=async()=>adapter;
  let result=await getReviewAnalysis({ids});
  assert.equal(result.alerts.length,1);
  const alert=result.alerts[0];
  result=await changeReviewMemory({ids,token:result.token,action:'decide',key:alert.key,fingerprint:alert.fingerprint,reason:'Dos locales distintos',reuse:true},'tester');
  assert.equal(result.alerts.length,0);assert.equal(result.criteria.length,1);
  assert.equal((await getReviewAnalysis({ids})).resolved[0].reason,'Dos locales distintos');
  await db.query("UPDATE tesoreria_movimientos_bancarios SET comentarios='Solo cambia comentario',updated_at=now() WHERE id_linea_banco='first'");
  assert.equal((await getReviewAnalysis({ids})).alerts.length,0);
  await db.query("INSERT INTO tesoreria_movimientos_bancarios(id_linea_banco,fecha_operativa,fecha_valor,importe,concepto,id_proveedor,id_cargo_recurrente) VALUES('future1','02/05/2026','02/05/2026',-50,'RECIBO comunidad local 154','supplier',1),('future2','04/05/2026','04/05/2026',-50,'RECIBO comunidad local 154','supplier',2)");
  const future=await getReviewAnalysis({ids:['future1','future2']});
  assert.equal(future.alerts.length,0);assert(future.resolved.some(r=>r.criterionId),'Rule survives PostgreSQL JSONB serialization');
  result=await changeReviewMemory({ids,action:'revoke-criterion',criterionId:result.criteria[0].id,token:result.token},'tester');
  assert.equal((await getReviewAnalysis({ids:['future1','future2']})).alerts.length,1);
  assert.equal(result.alerts.length,0,'Revoking reusable criterion preserves concrete decision');
  result=await changeReviewMemory({ids,action:'revoke-decision',decisionId:result.resolved[0].decisionId,token:result.token},'tester');
  assert.equal(result.alerts.length,1);
  const previous=result;
  await db.query("INSERT INTO tesoreria_movimientos_bancarios(id_linea_banco,fecha_operativa,fecha_valor,importe,concepto,id_proveedor,id_cargo_recurrente) VALUES('third','05/04/2026','05/04/2026',-50,'RECIBO comunidad local 154','supplier',2)");
  await assert.rejects(changeReviewMemory({ids,token:previous.token,action:'decide',key:previous.alerts[0].key,fingerprint:previous.alerts[0].fingerprint,reason:'Stale decision'},'tester'),/cambiado/);
  result=await getReviewAnalysis({ids});assert(result.alerts[0].ids.includes('third'));
  const occurrence=result.occurrences.find(o=>o.id_cargo_recurrente==='1'&&o.fecha==='2026-04-01');
  result=await changeReviewMemory({ids,token:result.token,action:'apply',lineId:'first',allocations:[{id:occurrence.id,amount:50}]},'tester');
  assert.equal(result.applications.length,1);
  await assert.rejects(changeReviewMemory({ids,token:result.token,action:'apply',lineId:'second',allocations:[{id:occurrence.id,amount:50}]}),/válido/,'Cannot apply another charge');
  const another=result.occurrences.find(o=>o.id_cargo_recurrente==='2'&&o.fecha==='2026-04-01');
  result=await changeReviewMemory({ids,token:result.token,action:'apply',lineId:'second',allocations:[{id:another.id,amount:25}]},'tester');
  assert(result.alerts.some(a=>a.type==='allocation'));
  const third=await getReviewAnalysis({ids:['third']});
  await assert.rejects(changeReviewMemory({ids:['third'],token:third.token,action:'apply',lineId:'third',allocations:[{id:another.id,amount:50}]}),/pendiente/);
  // Persisted applications are retained on unreview; review flag is not a criterion.
  await db.query("UPDATE tesoreria_movimientos_bancarios SET estado_revision=true WHERE id_linea_banco='first'");
  await db.query("UPDATE tesoreria_movimientos_bancarios SET estado_revision=false WHERE id_linea_banco='first'");
  assert.equal((await getReviewAnalysis({ids})).applications.length,2);
  // All pending decisions roll back if one application is invalid.
  await db.query('SAVEPOINT atomic_memory');
  try {
    await savePlannedReviewMemory(adapter,{allocations:[{lineId:'second',allocations:[]},{lineId:'first',allocations:[{id:another.id,amount:50}]}],decisions:[]},ids.map(id_linea_banco=>({id_linea_banco})),'tester');
    assert.fail('Expected invalid cross-charge application');
  } catch(e) { assert.match(e.message,/válido/);await db.query('ROLLBACK TO SAVEPOINT atomic_memory'); }
  assert.equal((await getReviewAnalysis({ids})).applications.length,2);
  // Preview changes are read-only, then saved atomically through the existing workflow hook.
  const preview=await getReviewAnalysis({ids:['third'],drafts:[{id:'third',entityType:'proveedor',entityId:'supplier',chargeId:'1'}]});
  assert(preview.occurrences.every(o=>o.id_cargo_recurrente==='1'));
  assert.equal((await db.query("SELECT id_cargo_recurrente FROM tesoreria_movimientos_bancarios WHERE id_linea_banco='third'")).rows[0].id_cargo_recurrente,'2');
  await assert.rejects(rememberDuplicateDiscard({ids:['future1','future2']},'tester'),/cambiado/);
  await db.query("UPDATE tesoreria_movimientos_bancarios SET fecha_operativa='02/05/2026' WHERE id_linea_banco='future2'");
  await rememberDuplicateDiscard({ids:['future1','future2']},'tester');
  assert.equal((await getReviewAnalysis({ids:['future1','future2']})).alerts.length,0);
  await db.query("UPDATE tesoreria_movimientos_bancarios SET concepto='Recibo comunidad local 154 ref 999' WHERE id_linea_banco='future2'");
  assert.equal((await getReviewAnalysis({ids:['future1','future2']})).alerts.filter(a=>a.type==='repeat').length,1,'Changing relevant evidence invalidates the legacy discard');
  await db.query("DELETE FROM tesoreria_movimientos_bancarios WHERE id_linea_banco='first'");
  assert.equal((await db.query("SELECT * FROM tesoreria_vencimientos_aplicaciones WHERE id_linea_banco='first'")).rowCount,0);
  console.log('PASS: isolated RDS migration, concrete/reusable memory, revocation, stale decisions, third receipt, allocation ownership/capacity, partial payments, rollback, read-only previews and delete cascade.');
} finally {pool.connect=connect;await db.query('ROLLBACK');db.release();await pool.end();}
