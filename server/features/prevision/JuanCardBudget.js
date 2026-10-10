export function projectJuanCardBudgets(sheets,charges,periods) {
 if(periods){for(const sheet of sheets){const fixed=sheet.payments.find(r=>r.cardPart==='subscriptions'),variable=sheet.payments.find(r=>r.cardPart==='variable');if(!fixed||!variable)continue;let other=sheet.payments.find(r=>r.cardPart==='others');if(!other){other={id:fixed.id.replace(/:subscriptions$/,':others'),label:'OTROS GASTOS PREVISTOS DE TARJETAS',cardPart:'others',day:variable.day,opening:false,values:sheet.columns.map(()=>null)};sheet.payments.push(other);}
  for(const [i,c]of sheet.columns.entries())if(c.kind==='forecast'&&!sheet.closedMonths?.includes(c.month)){
   const selected=periods.filter(p=>p.bank===sheet.bank&&Number(p.fecha.slice(5,7))===c.month),parts={subscriptions:[],variable:[],others:[]};
   for(const p of selected)for(const item of p.items){const category=item.tipo==='suscripcion'||item.id_vencimiento?'subscriptions':item.tipo==='ticket'?'variable':'others';parts[category].push({id:`card:${p.cardId}:${p.fecha}:${item.tipo}:${item.id}`,label:`${p.cardName} · ${item.descripcion}`,date:p.fecha,detail:`Consumo ${item.fecha}; cierre ${p.cierre}`,amount:Math.round(Number(item.importe)*100),editable:false,href:`/dashboard/administracion/liquidaciones/tarjetas/${encodeURIComponent(p.cardId)}`});}
   const sub=parts.subscriptions.reduce((n,p)=>n+p.amount,0),tickets=parts.variable.reduce((n,p)=>n+p.amount,0),extras=parts.others.reduce((n,p)=>n+p.amount,0),envelope=(variable.values[i]||0)+(variable.budgetIsEnvelope===false?sub:0),reserve=Math.max(0,envelope-sub-tickets-extras);
   if(reserve)parts.others.push({id:'card-reserve',label:'Reserva de tarjetas pendiente de detallar',detail:'Presupuesto de Juan conservado hasta identificar tickets u otros gastos',amount:reserve,editable:false});
   fixed.values[i]=sub;variable.values[i]=tickets;other.values[i]=extras+reserve;
   for(const [row,key]of [[fixed,'subscriptions'],[variable,'variable'],[other,'others']])row.cellDetails={...row.cellDetails,[i]:parts[key]};
  }
 }return;}
 for(const sheet of sheets)for(const fixed of sheet.payments.filter(r=>r.cardPart==='subscriptions')) {
  const variable=sheet.payments.find(r=>r.id===fixed.id.replace(/:subscriptions$/,':variable'));
  for(const [i,column] of sheet.columns.entries())if(column.kind==='forecast'&&!sheet.closedMonths?.includes(column.month)) {
   const total=charges.filter(c=>c.id_tarjeta&&c.banco_pago===sheet.bank).flatMap(c=>c.vencimientos||[]).filter(v=>Number(v.fecha.slice(5,7))===column.month).reduce((sum,v)=>sum+Math.round(Number(v.importe)*100),0);
   fixed.values[i]=total;
   if(variable&&variable.budgetIsEnvelope!==false&&variable.values[i]!==null){variable.exceedsEnvelope=total>variable.values[i];variable.values[i]=Math.max(0,variable.values[i]-total);}
  }
 }
}
