// Amounts are integer cents. Statement components retain their source and cannot
// be edited as if they were forecasts.
export function juanCellParts(book,sheet,section,row,column) {
 const month=sheet.columns[column].month,forecast=sheet.columns[column].kind==='forecast',total=row.values[column]??0;
 const saved=row.cellDetails?.[column];
 if(saved&&(!forecast||row.cardPart))return saved.map(p=>({...p,editable:false}));
 const association=book.associations.find(a=>a.bank===sheet.bank&&a.row_id===row.id);
 if(!forecast&&!row.opening&&section==='payments') {
  const ids=(association?.charge_ids||[]).map(String);
  const movements=(book.bankMovements||[]).filter(m=>m.banco===sheet.bank&&Number(m.importe)<0&&m.estado_revision&&!m.duplicado_descartado&&ids.includes(String(m.id_cargo_recurrente))&&Number((m.fecha_operativa||m.fecha_valor).split('/')[1])===month);
  if(movements.length&&movements.reduce((n,m)=>n+Math.round(-Number(m.importe)*100),0)===total)return movements.map(m=>({id:m.id_linea_banco,label:m.concepto,date:m.fecha_operativa,detail:'Movimiento bancario revisado',amount:Math.round(-Number(m.importe)*100),editable:false}));
 }
 if(forecast&&section==='payments') {
  const ids=association?.charge_ids||[];
  const parts=book.charges.filter(c=>ids.map(String).includes(String(c.id_cargo_recurrente))).flatMap(c=>(c.vencimientos||[]).filter(d=>Number(d.fecha.slice(5,7))===month).map(d=>({id:d.id,chargeId:String(c.id_cargo_recurrente),date:d.fecha,label:d.descripcion||c.programacion?.[0]?.descripcion||c.nombre_proveedor||c.nombre_agente||'Cargo previsto',detail:c.tipo_programacion==='periodicidad'?`Cada ${c.programacion?.[0]?.cada||1} ${c.programacion?.[0]?.unidad||'meses'}`:'Cargo puntual',amount:Math.round(Number(d.importe)*100),editable:true})));
  if(parts.length) {
   const remainder=total-parts.reduce((n,p)=>n+p.amount,0);
   if(remainder)parts.push({id:'reserve',label:'Previsión sin cargo identificado',detail:'Parte del presupuesto pendiente de identificar',amount:remainder,editable:true});
   return parts;
  }
 }
 if(forecast&&section==='income'&&/TRANSFERENCIAS|REMESAS|OTROS INGRESOS/i.test(row.label)) {
  const kind=/REMESAS/i.test(row.label)?'receipt':/TRANSFERENCIAS/i.test(row.label)?'transfer':'other';
  const parts=(book.orders||[]).filter(o=>{
   const date=o.fecha_teorica_cobro||'',dateMonth=Number(date.includes('/')?date.split('/')[1]:date.slice(5,7));
   const method=/recibo|remesa/i.test(o.forma_cobro||'')?'receipt':/transf|factor/i.test(o.forma_cobro||'')?'transfer':'other';
   return o.banco_cobro===sheet.bank&&dateMonth===month&&method===kind;
  }).map(o=>({id:o.id_orden,label:o.etiqueta_cobro||o.id_orden,date:o.fecha_teorica_cobro,detail:'Orden pendiente del control administrativo',amount:Math.round(Number(o.pending_amount)*100),editable:false}));
  if(parts.length){const remainder=total-parts.reduce((n,p)=>n+p.amount,0);if(remainder)parts.push({id:'reserve',label:'Previsión sin orden identificada',detail:'Presupuesto adicional de ingresos',amount:remainder,editable:true});return parts;}
 }
 return [{id:'single',label:row.label,detail:'Importe individual',amount:total,editable:!row.invoicePaymentId&&!row.internalTransferId&&!(row.cardPart==='subscriptions'&&forecast)}];
}
