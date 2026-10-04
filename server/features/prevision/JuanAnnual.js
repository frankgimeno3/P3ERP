import {generateOccurrences} from '../banco/BankReviewAnalysis.js';
import {readLiquidityBudgets,seedLiquidityBudgets} from './LiquidityForecastBudgets.js';
export const juanYear=value=>{const year=Number(value||new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(new Date()).slice(0,4));if(!Number.isInteger(year)||year<2026||year>2100)throw Object.assign(Error('Año no válido.'),{status:400});return year;};
export function nextJuanSheets(previous,year,charges=[],associations=[]) {
 return previous.map(source=>{
  const sheet=structuredClone(source);
  sheet.year=year;sheet.name=`${sheet.bank==='Sabadell'?'BSAB':'BSAN'} ${year}`;
  sheet.columns=Array.from({length:24},(_,i)=>({month:Math.floor(i/2)+1,kind:i%2?'forecast':'actual'}));
  sheet.checks=Array(24).fill(null);delete sheet.controls;sheet.closedMonths=[];
  for(const section of ['income','payments'])for(const row of sheet[section]) {
   const original=source[section].find(r=>r.id===row.id);
   const future=source.columns.flatMap((c,i)=>c.kind==='forecast'&&original.values[i]>0?[{month:c.month,amount:original.values[i]}]:[]);
   row.values=Array(24).fill(null);row.seeded=true;
   if(row.opening){row.label=`SALDO 01-01-${year} · pendiente de cierre`;continue;}
   if(section==='income'&&row.recurring) {
    const dues=generateOccurrences([{id_cargo_recurrente:row.id,tipo_cargo:'otro',tipo_programacion:'periodicidad',programacion:[row.recurring]}],`${year}-01-01`,`${year}-12-31`).occurrences;
    for(let month=1;month<=12;month++)row.values[(month-1)*2+1]=dues.filter(d=>Number(d.fecha.slice(5,7))===month).reduce((n,d)=>n+Math.round(Number(d.importe)*100),0)||null;
    continue;
   }
   for(let month=1;month<=12;month++) {
    let amount=future.find(f=>f.month===month)?.amount??null;
    if(future.length>=3&&future.every(f=>f.amount===future[0].amount))amount=future[0].amount;
    if(future.length===2&&future[1].month-future[0].month===2&&month%2===future[0].month%2)amount=future[0].amount;
    if(row.cardPart==='variable'&&amount===null&&future.length)amount=future.at(-1).amount;
    if(section==='payments'&&future.length===0&&/^(SEGURO|ADESLAS|IRPF|IVA|IMPUESTO|AJ\.)/.test(row.label)&&!source.payments.some(r=>r.id.startsWith(row.id+':'))) {
     const actual=source.columns.findIndex(c=>c.month===month&&c.kind==='actual');
     if(actual>=0&&original.values[actual]>0)amount=original.values[actual];
    }
    if(row.label==='COMISIONES REMESAS Y TRANSFERENCIAS'&&amount===null&&future.length)amount=Math.round(future.reduce((sum,f)=>sum+f.amount,0)/future.length);
    if(section==='income'&&/PREVISTAS DE COBRO/.test(row.label)) {
     const actualRow=source.income.find(r=>/REMESAS/.test(row.label)?r.label==='REMESAS RECIBOS COBRADAS':r.label==='TRANSFERENCIAS COBRADAS');
     const index=source.columns.findIndex(c=>c.month===month&&c.kind==='actual');
     if(amount===null&&actualRow&&index>=0)amount=actualRow.values[index];
    }
    row.values[(month-1)*2+1]=amount;
   }
   const association=associations.find(a=>a.bank===sheet.bank&&a.row_id===row.id);
   const linked=charges.filter(c=>association?.charge_ids?.includes(String(c.id_cargo_recurrente))&&c.activo!==false&&c.banco_pago===sheet.bank);
   const dues=linked.flatMap(charge=>generateOccurrences([{...charge,tipo_cargo:charge.tipo_cargo==='nomina'?'otro':charge.tipo_cargo}],`${year}-01-01`,`${year}-12-31`).occurrences);
   if(dues.length)for(let month=1;month<=12;month++)row.values[(month-1)*2+1]=dues.filter(v=>Number(v.fecha.slice(5,7))===month).reduce((sum,v)=>sum+Math.round(Number(v.importe)*100),0)||null;
  }
  return sheet;
 });
}
export async function ensureJuanYears(pool,now=new Date()) {
 const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Madrid'}).format(now),current=Number(today.slice(0,4)),last=current+(Number(today.slice(5,7))>=10?1:0);
 const db=await pool.connect();
 try {
  await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('juan:annual'))");
  for(let year=2027;year<=last;year++) {
   if((await db.query('SELECT 1 FROM tesoreria_prevision_juan WHERE id=$1',[`juan-${year}`])).rowCount)continue;
   const prior=(await db.query('SELECT * FROM tesoreria_prevision_juan WHERE id=$1',[`juan-${year-1}`])).rows[0];if(!prior)break;
   const charges=(await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE activo')).rows;
   const associations=(await db.query('SELECT * FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id=$1',[prior.id])).rows;
   await readLiquidityBudgets(db,year-1,prior.sheets);
   const sheets=nextJuanSheets(prior.sheets,year,charges,associations);
   await db.query('INSERT INTO tesoreria_prevision_juan(id,source_name,sheets,original_sheets) VALUES($1,$2,$3::jsonb,$3::jsonb)',[`juan-${year}`,`Base revisable de ${year-1}`,JSON.stringify(sheets)]);
   await seedLiquidityBudgets(db,year,sheets);
   for(const a of associations) {
    const charge=charges.find(c=>a.charge_ids?.length===1&&String(c.id_cargo_recurrente)===a.charge_ids[0]);
    const canonical=charge&&generateOccurrences([{...charge,tipo_cargo:charge.tipo_cargo==='nomina'?'otro':charge.tipo_cargo}],`${year}-01-01`,`${year}-12-31`).occurrences.length>0;
    const status=a.status==='group'?'group':canonical?'matched':'projected';
    await db.query('INSERT INTO tesoreria_prevision_juan_asociaciones(workbook_id,bank,row_id,status,provider_id,employee_id,charge_ids,evidence) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)',[`juan-${year}`,a.bank,a.row_id,status,a.provider_id,a.employee_id,JSON.stringify(a.charge_ids),JSON.stringify({reason:canonical?'Previsión vinculada a la programación vigente del ERP.':'Base copiada del año anterior: importe y periodicidad estimados, pendientes de revisión. No es un vencimiento nuevo del ERP.',conflicts:[],candidates:[],seedYear:year-1})]);
    if(canonical)for(const cell of sheets.find(s=>s.bank===a.bank).columns.filter(c=>c.kind==='forecast'))await db.query('INSERT INTO tesoreria_prevision_juan_enlaces(workbook_id,cell_key,section,target_id,status,note) VALUES($1,$2,$3,$4,$5,$6)',[`juan-${year}`,`${a.bank}:${a.row_id}:${cell.month}`,'payments',String(charge.id_cargo_recurrente),'matched','Programación vigente del ERP']);
   }
  }
  await db.query('COMMIT');
 }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
 return (await pool.query("SELECT substring(id from '[0-9]+')::int AS \"year\" FROM tesoreria_prevision_juan WHERE id ~ '^juan-[0-9]{4}$' ORDER BY 1")).rows.map(r=>r.year);
}
