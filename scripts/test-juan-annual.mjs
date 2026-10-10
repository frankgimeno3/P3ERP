import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {getJuanWorkbook} from '../server/features/prevision/JuanRepository.js';
import {nextJuanSheets} from '../server/features/prevision/JuanAnnual.js';
env.loadEnvConfig(process.cwd());const p=getPgPool();
try {
 const b=await getJuanWorkbook(p,2027),old=await getJuanWorkbook(p,2026);
 assert.equal(b.sheets.length,2);for(const s of b.sheets){assert.equal(s.year,2027);assert.equal(s.columns.length,24);assert.ok(s.income.filter(r=>!r.opening).concat(s.payments).every(r=>r.values.every((v,i)=>i%2===1||v===null)));}
 for(const month of Array.from({length:12},(_,i)=>i+1))assert.equal(b.planned.find(c=>c.label==='NOMINA VICTOR JOVEN'&&c.month===month).amount,120000);
 assert.equal(b.planned.find(c=>c.rowId==='payments:21'&&c.month===1).amount,4840);
 assert.equal(b.planned.filter(c=>c.bank==='Santander'&&c.rowId==='payments:42').length,12);
 assert.equal(old.planned.find(c=>c.rowId==='payments:46:hosting').amount,25226);assert.equal(old.planned.find(c=>c.rowId==='payments:46:soporte').amount,41423);
 for(const s of old.sheets){const parents=s.payments.filter(r=>/^VISA/.test(r.label)&&!r.cardPart);for(const r of parents)assert.ok(s.columns.every((c,i)=>c.kind!=='forecast'||r.values[i]===null));}
 const seed=JSON.stringify(old.sheets);const next=nextJuanSheets(old.sheets,2028,[],[]);assert.equal(JSON.stringify(old.sheets),seed);assert.equal(next[0].year,2028);
 const withTransfer=structuredClone(old.sheets);withTransfer[0].payments.push({id:'payments:transfer:test',internalTransferId:'test',label:'Traspaso puntual',values:withTransfer[0].columns.map(c=>c.month===12&&c.kind==='forecast'?10000:null)});
 const following=nextJuanSheets(withTransfer,2028,[],[]);assert(!following[0].payments.some(r=>r.internalTransferId),'One-off transfers are never copied as annual recurrences');assert(following[0].payments.every(r=>!r.cellDetails),'Prior year statement breakdowns cannot appear as new year actuals');
 const output=ts.transpileModule(fs.readFileSync('app/config/roleAccess.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 const exports={};new Function('exports',output)(exports);
 assert.equal(exports.normalizeRole('direccion'),'direccion');assert.ok(exports.canAccessDashboardPath('direccion','/dashboard/direccion/tesoreria/prevision-liquidez/vista-juan'));assert.ok(exports.canAccessApiPath('direccion','/api/v1/direccion/prevision-liquidez/vista-juan','PATCH'));
 assert.equal(exports.canAccessApiPath('direccion','/api/v1/admin/user-wizard','POST'),false);assert.equal(exports.canAccessDashboardPath('direccion','/dashboard/operaciones/roles'),false);
 console.log('PASS: annual 24-column forecasts, no fabricated actuals/opening balance, Victor monthly, annual information service, PIXUP, card split, immutable seed, Direction access without user/role administration.');
}finally{await p.end();}
