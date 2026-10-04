export const incomeMode=value=>/recibo|remesa/i.test(value||'')?'receipt':/transfer|transf/i.test(value||'')?'transfer':'other';
export const incomeRowMode=label=>/PREVISTAS DE COBRO/.test(label)?/REMESAS/.test(label)?'receipt':/TRANSFERENCIAS/.test(label)?'transfer':'other':null;
export const orderMonth=order=>Number((order.fecha_teorica_cobro||'').includes('/')?order.fecha_teorica_cobro.split('/')[1]:order.fecha_teorica_cobro.slice(5,7));
export function projectJuanIncomeBudgets(sheets,orders,applications=[]) {
 const differences=[];
 for(const sheet of sheets)for(const row of sheet.income) {
  const mode=incomeRowMode(row.label);if(!mode)continue;
  for(const [index,column] of sheet.columns.entries())if(column.kind==='forecast'&&!sheet.closedMonths?.includes(column.month)) {
   const details=orders.filter(o=>o.banco_cobro===sheet.bank&&incomeMode(o.forma_cobro)===mode&&orderMonth(o)===column.month).reduce((n,o)=>n+Math.round(Number(o.pending_amount??o.cobro_total)*100),0);
   const applied=applications.filter(a=>a.cell_key===`${sheet.bank}:${row.id}:${column.month}`&&a.estado_revision&&!a.duplicado_descartado).reduce((n,a)=>n+Math.round(Number(a.importe)*100),0);
   const baseline=row.values[index]||0,required=details+applied;
   row.orderPending={...row.orderPending,[column.month]:details};
   if(required>baseline){row.values[index]=required;differences.push({bank:sheet.bank,rowId:row.id,label:row.label,month:column.month,budget:baseline,orders:details,required});}
  }
 }
 return differences;
}
