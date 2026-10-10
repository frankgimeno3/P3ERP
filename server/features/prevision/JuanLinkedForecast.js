// Confirmed rows use the existing ERP charge as their single source of forecast amounts.
// Unresolved associations and grouped budgets retain Juan's values until resolved together.
import {generateOccurrences} from '../banco/BankReviewAnalysis.js';
export function projectJuanLinkedForecast(sheets,links,charges,associations=[]) {
 const dates=new Map();
 for(const sheet of sheets)for(const section of ['income','payments'])for(const row of sheet[section])for(const [index,column] of sheet.columns.entries()) {
  if(section!=='payments'||column.kind!=='forecast')continue;
  if(sheet.closedMonths?.includes(column.month))continue;
  const key=`${sheet.bank}:${row.id}:${column.month}`;
  const group=associations.find(a=>a.bank===sheet.bank&&a.row_id===row.id&&a.status==='group'&&a.evidence?.aggregate_charges);
  if(group) {
   const dues=charges.filter(c=>group.charge_ids.map(String).includes(String(c.id_cargo_recurrente))&&c.activo!==false&&c.banco_pago===sheet.bank).flatMap(c=>c.vencimientos||[]).filter(d=>Number(d.fecha.slice(5,7))===column.month);
   row.values[index]=dues.length?dues.reduce((n,d)=>n+Math.round(Number(d.importe)*100),0):null;
   continue;
  }
  const link=links.find(l=>l.cell_key===key&&['matched','integrated'].includes(l.status));
  if(!link?.target_id)continue;
  const charge=charges.find(c=>String(c.id_cargo_recurrente)===String(link.target_id));
  if(!charge||charge.activo===false||charge.banco_pago!==sheet.bank){row.values[index]=null;continue;}
  let dues=charge.vencimientos||[];
  if(charge.tipo_cargo==='nomina')dues=generateOccurrences([{...charge,tipo_cargo:'otro'}],`${sheet.year||2026}-01-01`,`${sheet.year||2026}-12-31`).occurrences;
  const monthDues=dues.filter(v=>Number(v.fecha.slice(5,7))===column.month);
  row.values[index]=monthDues.length?monthDues.reduce((sum,v)=>sum+Math.round(Number(v.importe)*100),0):null;
  const rule=charge.programacion?.length===1?charge.programacion[0]:null;
  if(rule&&charge.tipo_programacion==='periodicidad'&&rule.unidad==='meses'&&Number(rule.inicio_dia)>0)row.day=Number(rule.inicio_dia);
  if(monthDues.length===1)dates.set(key,monthDues[0].fecha.split('-').reverse().join('/'));
 }
 return dates;
}
