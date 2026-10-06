import assert from 'node:assert/strict';
import {magazineMonths,magazineDate,magazineDateKey,magazineEvents} from '../app/config/magazineEvents.js';
const months=magazineMonths(new Date(2026,9,6));
assert.equal(months.length,24);
assert.equal(months[0].month,9);assert.equal(months[23].year,2028);assert.equal(months[23].month,8);
assert.deepEqual(months[0].weeks[0],[null,null,null,1,2,3,4]);
for(const month of months){
  const days=month.weeks.flat().filter(day=>day!==null);
  assert.equal(days.length,new Date(month.year,month.month+1,0).getDate());
  assert.deepEqual(days,Array.from({length:days.length},(_,i)=>i+1));
  assert.ok(month.weeks.every(week=>week.length===7));
}
assert.equal(magazineMonths(new Date(2028,1,1),1)[0].weeks.flat().filter(Boolean).length,29);
assert.equal(magazineDate('29/02/2028'),'29/02/2028');
assert.equal(magazineDate('29/02/2027'),null);assert.equal(magazineDate('31/04/2026'),null);
assert.equal(magazineDate('5/10/2026'),'05/10/2026');assert.equal(magazineDateKey('2026-10-05'),'2026-10-05');
assert.equal(magazineDate('05//2026'),null);assert.equal(magazineDate(''), '');
assert.equal(new Set(magazineEvents.map(event=>event.key)).size,7);
console.log('PASS: 24 meses, semanas lunes-domingo, año bisiesto y fechas válidas.');
