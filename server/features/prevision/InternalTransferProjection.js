// A one-off plan produces an equal expense and income, never a recurring charge.
export function projectInternalTransfers(sheets,transfers,movements) {
  const active=new Set(transfers.filter(t=>t.prevision&&t.estado!=='cancelado').map(t=>t.id));
  for(const sheet of sheets)for(const section of ['income','payments'])sheet[section]=sheet[section].filter(row=>!row.internalTransferId||active.has(row.internalTransferId)||sheet.columns.some((column,i)=>sheet.closedMonths?.includes(column.month)&&row.values[i]!==null));
  for(const t of transfers.filter(t=>t.prevision&&t.estado!=='cancelado'))for(const [bank,section,lineId] of [[t.banco_origen,'payments',t.id_linea_cargo],[t.banco_destino,'income',t.id_linea_abono]]) {
    const sheet=sheets.find(s=>s.bank===bank);if(!sheet||Number(t.fecha.slice(0,4))!==Number(sheet.year||2026))continue;
    const id=`${section}:transfer:${t.id}`;
    const existing=sheet[section].find(r=>r.id===id);
    const movement=movements.find(m=>m.id_linea_banco===lineId);
    const actual=t.estado==='revisado'&&movement?.estado_revision;
    const values=sheet.columns.map((c,i)=>sheet.closedMonths?.includes(c.month)&&existing?existing.values[i]:c.month===Number(t.fecha.slice(5,7))&&((t.estado==='previsto'&&c.kind==='forecast')||(actual&&c.kind==='actual'))?Math.round(Number(t.importe)*100):null);
    const row={id,label:`Traspaso propio ${t.banco_origen} → ${t.banco_destino}`,opening:false,day:Number(t.fecha.slice(8)),internalTransferId:t.id,values};
    if(existing)Object.assign(existing,row);else sheet[section].push(row);
  }
}
