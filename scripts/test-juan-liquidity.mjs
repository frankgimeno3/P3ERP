import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {parseJuanExcel,plannedJuanCells,juanTotals,JUAN_SOURCE} from '../server/features/prevision/JuanExcel.js';
const sheets=parseJuanExcel(fs.readFileSync(process.argv[2] || path.join(os.homedir(),'OneDrive','Escritorio',JUAN_SOURCE)));
const cells=plannedJuanCells(sheets);
assert.equal(cells.length,94);
assert.equal(new Set(cells.map(cell=>cell.key)).size,94);
assert.equal(sheets.length,2);
assert.ok(sheets.every(sheet=>sheet.iban.startsWith('ES')));
assert.deepEqual(sheets.map(sheet=>juanTotals(sheet).balances.at(-1)),[-1035611,1153250]);
assert.deepEqual(sheets.map(sheet=>juanTotals(sheet).balances[8]),[2993945,3045974]);
for(const sheet of sheets) {
  assert.deepEqual(juanTotals(sheet).differences.filter(value=>value!==null),Array(9).fill(0));
  for(const section of ['income','payments'])assert.deepEqual(juanTotals(sheet)[section],sheet.controls[section]);
  assert.equal(juanTotals(sheet).balances[13],juanTotals(sheet).balances[8]);
}
assert.equal(cells.filter(cell=>cell.section==='income').reduce((sum,cell)=>sum+cell.amount,0),4436484);
assert.equal(cells.filter(cell=>cell.section==='payments').reduce((sum,cell)=>sum+cell.amount,0),10358764);
assert.ok(cells.every(cell=>cell.date.endsWith('/2026')&&Number(cell.date.slice(3,5))>=10));
assert.ok(cells.filter(cell=>cell.label.includes('NOMINA')&&cell.month===11).every(cell=>Number(cell.date.slice(0,2))<=30));
assert.ok(cells.filter(cell=>cell.section==='income').every(cell=>cell.estimatedDate));
assert.ok(cells.every(cell=>!cell.label.startsWith('SALDO')));
const changed=structuredClone(sheets[0]);
changed.payments.find(row=>row.label==='NOMINA FRANK').values[10]+=10000;
assert.equal(juanTotals(changed).balances.at(-1),-1045611);
assert.equal(juanTotals(sheets[0]).balances.at(-1),-1035611);
console.log('PASS: 94 unique forecasts, opening balances excluded, monthly source controls, all 18 closing checks, year/month/day boundaries and recalculation after edits.');
