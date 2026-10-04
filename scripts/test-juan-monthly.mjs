import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {getJuanWorkbook,applyJuanMovement,editJuanCell} from '../server/features/prevision/JuanRepository.js';
import {closeJuanMonth,monthlyJuanReview} from '../server/features/prevision/JuanMonthly.js';
env.loadEnvConfig(process.cwd());const p=getPgPool(),db=await p.connect();
try {
 const review=monthlyJuanReview({sheets:[{bank:'Sabadell',columns:[{kind:'forecast',month:10}]}],planned:[{bank:'Sabadell',month:10,section:'income',amount:100000,pending:25000}],orders:[{banco_cobro:'Sabadell',fecha_teorica_cobro:'31/10/2026',pending_amount:250}],links:[]});
 assert.equal(review[0].incomeDifference,0);assert.equal(review[0].income,100000);
 await db.query('BEGIN');const schema='test_month_'+randomUUID().replaceAll('-','');
 await db.query('CREATE SCHEMA '+schema);await db.query('SET LOCAL search_path TO '+schema+',public');
 for(const table of ['tesoreria_prevision_juan','tesoreria_prevision_juan_enlaces','tesoreria_prevision_juan_asociaciones','tesoreria_prevision_juan_aplicaciones','tesoreria_movimientos_bancarios'])await db.query(`CREATE TABLE ${schema}.${table} (LIKE public.${table} INCLUDING ALL)`);
 await db.query(`INSERT INTO ${schema}.tesoreria_prevision_juan SELECT * FROM public.tesoreria_prevision_juan WHERE id='juan-2026'`);
 const query=(sql,...args)=>/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)?Promise.resolve({rows:[],rowCount:0}):db.query(sql,...args),adapter={query,connect:async()=>({query,release(){}})};
 let b=await getJuanWorkbook(adapter),cell=b.planned.find(c=>c.label==='NOMINA RICARDO'&&c.month===10),closing=b.totals[0].balances.at(-1);
 await db.query("INSERT INTO tesoreria_movimientos_bancarios(id_linea_banco,banco,importe,saldo,fecha_operativa,fecha_valor,estado_revision) VALUES('banc_sab_26_000.999.091','Sabadell',-500,29439.45,'31/10/2026','31/10/2026',TRUE)");
 await assert.rejects(closeJuanMonth({year:2026,bank:'Sabadell',month:10,version:b.version},adapter,new Date('2026-10-03')),/mes terminado/);
 await assert.rejects(closeJuanMonth({year:2026,bank:'Sabadell',month:10,version:b.version},adapter,new Date('2026-11-01')),/sin revisar o sin asociar/);
 b=await applyJuanMovement({cellKey:cell.key,lineId:'banc_sab_26_000.999.091',amount:50000},adapter);
 b=await closeJuanMonth({year:2026,bank:'Sabadell',month:10,version:b.version},adapter,new Date('2026-11-01'));
 let row=b.sheets[0].payments.find(r=>r.id===cell.rowId);
 assert.equal(row.values[9],50000);assert.equal(row.values[10],150000);assert.equal(b.planned.find(c=>c.key===cell.key).pending,150000);assert.equal(b.totals[0].balances.at(-1),closing);
 await assert.rejects(editJuanCell({year:2026,version:b.version,bank:'Sabadell',section:'payments',rowId:row.id,column:10,value:140000},adapter),/Mes cerrado/);
 await assert.rejects(applyJuanMovement({cellKey:cell.key,lineId:'banc_sab_26_000.999.091',remove:true},adapter),/Mes cerrado/);
 b=await closeJuanMonth({action:'reopen-month',year:2026,bank:'Sabadell',month:10,version:b.version},adapter,new Date('2026-11-01'));
 row=b.sheets[0].payments.find(r=>r.id===cell.rowId);assert.equal(row.values[10],200000);assert.equal(row.values[9],null);assert.equal(b.planned.find(c=>c.key===cell.key).pending,150000);
 console.log('PASS: future and incomplete months blocked; actual plus residual equals original budget; no double subtraction; closed edits blocked; reopening restores budget. All test changes rolled back.');
}finally{await db.query('ROLLBACK');db.release();await p.end();}
