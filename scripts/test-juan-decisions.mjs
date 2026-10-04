import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {getJuanWorkbook} from '../server/features/prevision/JuanRepository.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool();
try {
 const audit=JSON.parse(fs.readFileSync(path.join(os.tmpdir(),'p3-juan-decisions-20261003.json'),'utf8'));
 const book=await getJuanWorkbook(pool);
 const raw=(await pool.query("SELECT original_sheets FROM tesoreria_prevision_juan WHERE id='juan-2026'")).rows[0];
 assert.deepEqual(raw.original_sheets,audit.before.original_sheets);
 for(const before of audit.before.sheets)for(const section of ['income','payments'])for(const row of before[section]) {
  const after=book.sheets.find(s=>s.bank===before.bank)[section].find(r=>r.id===row.id);
  for(const [i,c] of before.columns.entries())if(c.kind==='actual')assert.equal(after.values[i],row.values[i],`${row.label} histórico ${c.month}`);
 }
 for(const [bank,label,id,day,amount] of [['Sabadell','ALQUILER 1º','5',7,916.71],['Sabadell','ALQUILER 2º','6',7,830.38],['Sabadell','SOFTLINE','7',27,123.92],['Sabadell','BITAVIS','15',27,116.22],['Sabadell','DAE LABORAL','4',31,179.32],['Santander','SECURITAS LLÚRIA','16',8,49.78],['Santander','SECURITAS BREDA','17',8,58.95],['Santander','SECURITAS BRUC','18',8,57.60]]) {
  const charge=book.charges.find(c=>String(c.id_cargo_recurrente)===id);
  assert.equal(charge.banco_pago,bank);
  assert.equal(Number(charge.programacion[0].inicio_dia),day);
  for(const month of [10,11,12]) {
   const planned=book.planned.find(c=>c.bank===bank&&c.label===label&&c.month===month);
   assert.equal(planned.amount,Math.round(amount*100));
   const due=charge.vencimientos.filter(v=>Number(v.fecha.slice(5,7))===month);
   assert.equal(due.length,1);
   assert.equal(due[0].fecha,`2026-${month}-${String(Math.min(day,new Date(Date.UTC(2026,month,0)).getUTCDate())).padStart(2,'0')}`);
   assert.equal(Number(due[0].importe),amount);
  }
 }
 for(const id of ['2','3','8','9','10','11','12']) {
  const charge=book.charges.find(c=>String(c.id_cargo_recurrente)===id);
  assert.equal(charge.tipo_cargo,'nomina');assert.ok(charge.id_agente);assert.equal(charge.id_proveedor,null);
 }
 for(const [label,amount] of [['NOMINA FRANK',545800],['NOMINA MELANI',123926]])for(const month of [10,11,12])assert.equal(book.planned.find(c=>c.label===label&&c.bank==='Sabadell'&&c.month===month).amount,amount);
 assert.equal(book.planned.filter(c=>c.bank==='Santander'&&c.rowId==='payments:20').length,0);
 assert.equal(book.planned.filter(c=>c.label.startsWith('SECURITAS ')).length,9);
 const victor=(await pool.query("SELECT * FROM agentes_db WHERE email_agente='internationalsales@vidrioperfil.com'")).rows;
 assert.equal(victor.length,1);assert.equal(victor[0].estado_agente,'activo');assert.equal(victor[0].nombre_completo_agente,'Víctor Joven Castillo');assert.equal(victor[0].is_empleado_account,true);
 const victorCharges=book.charges.filter(c=>c.id_agente===victor[0].id_agente);
 assert.equal(victorCharges.length,1);assert.equal(victorCharges[0].tipo_cargo,'nomina');
 const amarant=book.associations.find(a=>a.bank==='Sabadell'&&a.row_id==='payments:47');
 assert.equal(amarant.provider_id,'prov_excel_serveis_grafics_amarant');assert.equal(amarant.charge_ids.length,1);
 const cosva=book.associations.find(a=>a.bank==='Sabadell'&&a.row_id==='payments:26');assert.equal(cosva.status,'matched');
 const cosvaCharge=book.charges.find(c=>String(c.id_cargo_recurrente)==='20');assert.equal(cosvaCharge.vencimientos[0].fecha,'2026-12-03');
 console.log('PASS: payroll identity, shared approved amounts/dates, three Securitas contracts without duplication, Victor active, Amarant supplier, Cosva day 3, original and actual history preserved. Read-only verification.');
}finally{await pool.end();}
