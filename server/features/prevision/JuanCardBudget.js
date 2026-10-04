export function projectJuanCardBudgets(sheets,charges) {
 for(const sheet of sheets)for(const fixed of sheet.payments.filter(r=>r.cardPart==='subscriptions')) {
  const variable=sheet.payments.find(r=>r.id===fixed.id.replace(/:subscriptions$/,':variable'));
  for(const [i,column] of sheet.columns.entries())if(column.kind==='forecast'&&!sheet.closedMonths?.includes(column.month)) {
   const total=charges.filter(c=>c.id_tarjeta&&c.banco_pago===sheet.bank).flatMap(c=>c.vencimientos||[]).filter(v=>Number(v.fecha.slice(5,7))===column.month).reduce((sum,v)=>sum+Math.round(Number(v.importe)*100),0);
   fixed.values[i]=total;
   if(variable&&variable.budgetIsEnvelope!==false&&variable.values[i]!==null){variable.exceedsEnvelope=total>variable.values[i];variable.values[i]=Math.max(0,variable.values[i]-total);}
  }
 }
}
