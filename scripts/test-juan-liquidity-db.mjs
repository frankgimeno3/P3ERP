import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {getJuanWorkbook,editJuanCell,applyJuanMovement,getJuanLiquidity} from '../server/features/prevision/JuanRepository.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
try {
  await db.query('BEGIN');
  const schema='test_juan_'+randomUUID().replaceAll('-','');
  await db.query('CREATE SCHEMA '+schema);
  await db.query('SET LOCAL search_path TO '+schema+',public');
  for(const table of ['tesoreria_prevision_juan','tesoreria_prevision_juan_enlaces','tesoreria_prevision_juan_aplicaciones','tesoreria_prevision_juan_asociaciones','tesoreria_movimientos_bancarios'])await db.query(`CREATE TABLE ${schema}.${table} (LIKE public.${table} INCLUDING ALL)`);
  await db.query(`INSERT INTO ${schema}.tesoreria_prevision_juan SELECT * FROM public.tesoreria_prevision_juan WHERE id='juan-2026'`);
  // Repository transaction boundaries are contained by this test's rollback.
  const query=(sql,...args)=>/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)?Promise.resolve({rows:[],rowCount:0}):db.query(sql,...args);
  const adapter={query,connect:async()=>({query,release(){}})};
  let workbook=await getJuanWorkbook(adapter);
  assert.ok(workbook.planned.length>=94);
  const cell=workbook.planned.find(c=>c.bank==='Sabadell'&&c.label==='NOMINA FRANK'&&c.month===10);
  const version=workbook.version;
  const initialClosing=workbook.totals[0].balances.at(-1);
  const initialAmount=cell.amount;
  const initialSantanderClosing=workbook.totals[1].balances.at(-1);
  await assert.rejects(editJuanCell({version:version-1,bank:'Sabadell',section:'payments',rowId:cell.rowId,column:10,value:560000},adapter),/Otra persona/);
  workbook=await editJuanCell({version,bank:'Sabadell',section:'payments',rowId:cell.rowId,column:10,value:560000},adapter);
  assert.equal(workbook.planned.find(c=>c.key===cell.key).amount,560000);
  assert.equal(workbook.totals[0].balances.at(-1),initialClosing-(560000-initialAmount));
  await db.query(`INSERT INTO tesoreria_movimientos_bancarios(id_linea_banco,banco,importe,saldo,fecha_operativa,fecha_valor,estado_revision)
    VALUES('banc_sab_26_000.999.001','Sabadell',-1000,9000,'31/10/2026','31/10/2026',true),('banc_sab_26_000.999.002','Sabadell',-1000,8000,'31/10/2026','31/10/2026',false),('banc_sab_26_000.999.003','Sabadell',1000,10000,'31/10/2026','31/10/2026',true)`);
  await assert.rejects(applyJuanMovement({cellKey:cell.key,lineId:'banc_sab_26_000.999.002',amount:100000},adapter),/confirma primero/);
  await assert.rejects(applyJuanMovement({cellKey:cell.key,lineId:'banc_sab_26_000.999.003',amount:100000},adapter),/signo/);
  workbook=await applyJuanMovement({cellKey:cell.key,lineId:'banc_sab_26_000.999.001',amount:60000},adapter);
  assert.equal(workbook.balances.find(row=>row.bank==='Sabadell'&&row.month===10).date,'31/10/2026');
  assert.equal(workbook.planned.find(c=>c.key===cell.key).pending,500000);
  const second=workbook.planned.find(c=>c.bank==='Sabadell'&&c.label==='NOMINA RICARDO'&&c.month===10);
  await assert.rejects(applyJuanMovement({cellKey:second.key,lineId:'banc_sab_26_000.999.001',amount:50000},adapter),/movimiento bancario disponible/);
  await applyJuanMovement({cellKey:second.key,lineId:'banc_sab_26_000.999.001',amount:40000},adapter);
  await assert.rejects(editJuanCell({version:(await getJuanWorkbook(adapter)).version,bank:'Sabadell',section:'payments',rowId:cell.rowId,column:10,value:50000},adapter),/inferior al importe aplicado/);
  await db.query("UPDATE tesoreria_movimientos_bancarios SET estado_revision=false WHERE id_linea_banco='banc_sab_26_000.999.001'");
  assert.equal((await getJuanWorkbook(adapter)).planned.find(c=>c.key===cell.key).pending,560000);
  workbook=await applyJuanMovement({cellKey:cell.key,lineId:'banc_sab_26_000.999.001',remove:true},adapter);
  assert.equal(workbook.applications.length,1);
  await editJuanCell({version:workbook.version,bank:'Sabadell',section:'payments',rowId:cell.rowId,column:10,value:initialAmount},adapter);
  const result=await getJuanLiquidity('31/12/2026',adapter);
  assert.equal(result.Sabadell,initialClosing/100);assert.equal(result.Santander,initialSantanderClosing/100);
  await assert.rejects(getJuanLiquidity('31/12/2025',adapter),/Año no válido/);
  console.log('PASS: imported persistence, optimistic locking, budget edit/recalculation, sign and review validation, partial/split applications, no movement double spend, reopening, removal and independent scenario. All test changes rolled back.');
}finally {await db.query('ROLLBACK');db.release();await pool.end();}
