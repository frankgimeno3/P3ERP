import assert from 'node:assert/strict';
import {projectJuanCardBudgets} from '../server/features/prevision/JuanCardBudget.js';
const make=()=>[{bank:'Sabadell',columns:[{month:10,kind:'forecast'}],payments:[{id:'visa:subscriptions',cardPart:'subscriptions',values:[0]},{id:'visa:variable',cardPart:'variable',values:[150000]}]}];
const charges=[{id_tarjeta:'card',banco_pago:'Sabadell',vencimientos:[{fecha:'2026-10-01',importe:30},{fecha:'2026-10-10',importe:100}]}];
let sheets=make();projectJuanCardBudgets(sheets,charges);assert.deepEqual(sheets[0].payments.map(r=>r.values[0]),[13000,137000]);
sheets=make();sheets[0].payments[1].budgetIsEnvelope=false;sheets[0].payments[1].values[0]=20000;projectJuanCardBudgets(sheets,charges);assert.deepEqual(sheets[0].payments.map(r=>r.values[0]),[13000,20000]);
sheets=make();sheets[0].closedMonths=[10];projectJuanCardBudgets(sheets,charges);assert.deepEqual(sheets[0].payments.map(r=>r.values[0]),[0,150000]);
console.log('PASS: monthly/annual subscriptions deducted from initial card envelope once; explicitly edited variable adds separately; closed months retain their snapshot.');
