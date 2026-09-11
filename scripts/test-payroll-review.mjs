// Database integration test; isolated schema, all fixtures and DDL rolled back.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import nextEnv from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';
import { reviewPayrollMovement } from '../server/features/prevision/PayrollReviewRepository.js';
nextEnv.loadEnvConfig(process.cwd());
const pool=getPgPool(), db=await pool.connect(), originalConnect=pool.connect;
const schema=`payroll_review_test_${randomUUID().replaceAll('-','')}`;
let depth=0;
const adapter={release(){},async query(sql,values){
  if(sql==='BEGIN')return db.query(`SAVEPOINT sp_${++depth}`);
  if(sql==='COMMIT')return db.query(`RELEASE SAVEPOINT sp_${depth--}`);
  if(sql==='ROLLBACK'){await db.query(`ROLLBACK TO SAVEPOINT sp_${depth}`);return db.query(`RELEASE SAVEPOINT sp_${depth--}`);}
  return db.query(sql,values);
}};
try {
  await db.query('BEGIN');await db.query(`CREATE SCHEMA ${schema}`);await db.query(`SET LOCAL search_path TO ${schema}`);
  await db.query(`CREATE TABLE agentes_db(id_agente TEXT PRIMARY KEY,is_empleado_account BOOLEAN);
    CREATE TABLE cargos_recurrentes(id_cargo_recurrente BIGSERIAL PRIMARY KEY,tipo_cargo TEXT,id_proveedor TEXT,id_agente TEXT,tipo_programacion TEXT,programacion JSONB,activo BOOLEAN DEFAULT TRUE,updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE UNIQUE INDEX active_employee ON cargos_recurrentes(id_agente) WHERE activo;
    CREATE TABLE lineas_bancos(id_linea_banco TEXT PRIMARY KEY,importe NUMERIC,id_agente TEXT,id_proveedor TEXT,id_cuenta TEXT,id_pago TEXT,id_orden TEXT,id_cargo_recurrente BIGINT,estado_revision BOOLEAN DEFAULT FALSE,comentarios TEXT DEFAULT '',nomina_revision JSONB,updated_at TIMESTAMPTZ DEFAULT NOW());
    CREATE TABLE nominas(id_empleado TEXT,id_transferencia TEXT);CREATE TABLE anticipos_empleados(id_empleado TEXT,id_transferencia TEXT);
    INSERT INTO agentes_db VALUES('employee',true);
    INSERT INTO lineas_bancos(id_linea_banco,importe) VALUES('old',-100),('new',-120),('exception',-90),('mismatch',-80),('income',50);`);
  pool.connect=async()=>adapter;
  const old=await reviewPayrollMovement('old',{id_agente:'employee',decision:'crear'});
  assert.equal(old.nomina_revision.importe_previsto,100);
  const current=async()=> (await db.query('SELECT * FROM cargos_recurrentes WHERE activo')).rows[0];
  const payload=async decision=>{const c=await current();return {id_agente:'employee',decision,expectedChargeId:c.id_cargo_recurrente,expectedSchedule:c.programacion};};
  const stale=await payload('actualizar');
  const updated=await reviewPayrollMovement('new',stale);
  assert.equal(updated.nomina_revision.importe_previsto,120);
  assert.equal((await db.query("SELECT * FROM lineas_bancos WHERE id_linea_banco='old'")).rows[0].nomina_revision.importe_previsto,100);
  assert.equal((await db.query("SELECT * FROM lineas_bancos WHERE id_linea_banco='old'")).rows[0].estado_revision,true);
  await assert.rejects(reviewPayrollMovement('mismatch',stale),error=>error.status===409);
  await reviewPayrollMovement('exception',await payload('puntual'));
  assert.equal((await current()).programacion[0].total_iva,120);
  assert.equal((await db.query("SELECT * FROM lineas_bancos WHERE id_linea_banco='exception'")).rows[0].nomina_revision.decision,'puntual');
  await assert.rejects(reviewPayrollMovement('mismatch',await payload('coincide')),error=>error.status===409);
  assert.equal((await db.query("SELECT estado_revision FROM lineas_bancos WHERE id_linea_banco='mismatch'")).rows[0].estado_revision,false);
  await assert.rejects(reviewPayrollMovement('income',await payload('puntual')),error=>error.status===400);
  assert.equal((await current()).programacion[0].cada,1);assert.equal((await current()).programacion[0].unidad,'meses');
  console.log('Payroll review integration passed: monthly creation, update, exception, stale requests, mismatch, income and preserved historical review.');
} finally {pool.connect=originalConnect;await db.query('ROLLBACK');db.release();await pool.end();}
