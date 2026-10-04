import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {getJuanWorkbook} from '../server/features/prevision/JuanRepository.js';
env.loadEnvConfig(process.cwd());const p=getPgPool();
try {
 const before=JSON.parse(fs.readFileSync(path.join(os.tmpdir(),'p3-juan-commissions-before.json'),'utf8'));
 const b=await getJuanWorkbook(p);
 for(const s of before.book.sheets)for(const section of ['income','payments'])for(const r of s[section]) {
  const after=b.sheets.find(sheet=>sheet.bank===s.bank)[section].find(row=>row.id===r.id);
  for(const [i,c] of s.columns.entries())if(c.kind==='actual')assert.equal(after.values[i],r.values[i]);
 }
 assert.equal((await p.query('SELECT count(*)::int n FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente IN(14,19) AND activo')).rows[0].n,0);
 assert.equal((await p.query('SELECT activo FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=13')).rows[0].activo,true);
 for(const [bank,rowId,amounts,day] of [['Sabadell','payments:19',[300,200,100],2],['Santander','payments:42',[1500,1500,1500],26]]) {
  const a=b.associations.find(a=>a.bank===bank&&a.row_id===rowId);
  assert.equal(a.status,'integrated');assert.equal(a.charge_ids.length,1);
  const c=b.charges.find(c=>String(c.id_cargo_recurrente)===a.charge_ids[0]);
  assert.equal(c.tipo_cargo,'proveedor');assert.equal(c.banco_pago,bank);assert.ok(c.id_proveedor);assert.equal(c.id_agente,null);
  assert.equal(c.vencimientos.length,3);
  for(const [i,month] of [10,11,12].entries()) {
   const cell=b.planned.find(cell=>cell.bank===bank&&cell.rowId===rowId&&cell.month===month);
   assert.equal(cell.amount,amounts[i]);assert.equal(cell.date,`${String(day).padStart(2,'0')}/${month}/2026`);
   const due=c.vencimientos.find(v=>Number(v.fecha.slice(5,7))===month);assert.equal(Math.round(Number(due.importe)*100),amounts[i]);
   assert.ok(b.links.some(l=>l.cell_key===cell.key&&l.target_id===String(c.id_cargo_recurrente)));
  }
 }
 const total=(await p.query("SELECT sum(v.importe) total FROM tesoreria_cargos_vencimientos v JOIN tesoreria_cargos_recurrentes c USING(id_cargo_recurrente) WHERE c.activo AND c.id_cargo_recurrente IN(SELECT target_id::bigint FROM tesoreria_prevision_juan_enlaces WHERE workbook_id='juan-2026' AND (cell_key LIKE 'Sabadell:payments:19:%' OR cell_key LIKE 'Santander:payments:42:%')) AND fecha BETWEEN '2026-10-01' AND '2026-12-31'")).rows[0].total;
 assert.equal(Number(total),51);
 console.log('PASS: six linked commission forecasts total 51 €, correct banks/providers/dates, unsupported charges inactive, information service and actual history retained. Read-only verification.');
}finally{await p.end();}
