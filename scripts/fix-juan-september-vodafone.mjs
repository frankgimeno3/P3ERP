// The September statement contains an already reviewed Vodafone receipt omitted from Juan's actuals.
import env from '@next/env';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {getPgPool} from '../server/database/pgClient.js';
import {juanTotals} from '../server/features/prevision/JuanExcel.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),apply=process.argv.includes('--apply');
try {
  await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
  const book=(await db.query("SELECT * FROM tesoreria_prevision_juan WHERE id='juan-2026' FOR UPDATE")).rows[0];
  const line=(await db.query("SELECT * FROM tesoreria_movimientos_bancarios WHERE id_linea_banco='banc_san_26_000.000.064' FOR SHARE")).rows[0];
  assert.equal(Number(line.importe),-74.97);assert.equal(Number(line.saldo),30384.77);
  assert.equal(line.estado_revision,true);assert.equal(String(line.id_cargo_recurrente),'31');
  assert(line.concepto.includes('Zi26-000375572'));
  const sheet=book.sheets.find(s=>s.bank==='Santander'),column=sheet.columns.findIndex(c=>c.month===9&&c.kind==='actual');
  const row=sheet.payments.find(r=>r.id==='payments:36');assert.equal(row.label,'VODAFONE');
  const before=structuredClone(book);
  assert([null,7497].includes(row.values[column]));assert([3045974,3038477].includes(sheet.checks[column]));
  row.values[column]=7497;sheet.checks[column]=3038477;
  sheet.historicalCorrections={...sheet.historicalCorrections,'2026-09-vodafone':{
    date:new Date().toISOString(),line:line.id_linea_banco,amount:7497,
    reason:'Recibo Vodafone revisado del 30/09/2026 omitido en el realizado importado. Comprobación actualizada al saldo del extracto; original_sheets se conserva.'}};
  assert.equal(juanTotals(sheet).balances[column],3038477);
  const sabadell=book.sheets.find(s=>s.bank==='Sabadell');assert.equal(juanTotals(sabadell).balances[column],2993945);
  if(apply) {
    await writeFile(path.join(process.env.USERPROFILE,'Downloads','p3erp-cierre-bancos-20261009',`before-september-${Date.now()}.json`),JSON.stringify(before),{flag:'wx'});
    await db.query("UPDATE tesoreria_prevision_juan SET sheets=$1::jsonb,version=version+1,updated_at=now() WHERE id='juan-2026'",[JSON.stringify(book.sheets)]);
  }
  await db.query(apply?'COMMIT':'ROLLBACK');
  console.log(JSON.stringify({applied:apply,september:{Sabadell:29939.45,Santander:30384.77},vodafone:74.97,bankLine:line.id_linea_banco}));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
