import { createHash } from 'node:crypto';

export const cents = value => Math.round(Number(value) * 100);
export const isoDate = value => value instanceof Date ? value.toISOString().slice(0,10) : String(value || '').slice(0,10);
export function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
export function addMonths(date, months, anchor) {
  const [y,m] = isoDate(date).split('-').map(Number);
  const end = new Date(Date.UTC(y,m-1+months+1,0)).getUTCDate();
  return new Date(Date.UTC(y,m-1+months,Math.min(anchor,end))).toISOString().slice(0,10);
}
export function nextPeriod(card) {
  const start = new Date(isoDate(card.proximo_cierre));
  start.setUTCDate(start.getUTCDate()+1);
  return {...card,inicio_periodo:isoDate(start),proximo_cierre:addMonths(card.proximo_cierre,card.periodicidad_meses,card.dia_cierre),proxima_liquidacion:addMonths(card.proxima_liquidacion,card.periodicidad_meses,card.dia_liquidacion)};
}
export function settlementForecast(card, tickets, dues) {
  const inicio=isoDate(card.inicio_periodo),cierre=isoDate(card.proximo_cierre),fecha=isoDate(card.proxima_liquidacion);
  if (![inicio,cierre,fecha].every(validDate)) return null;
  const within = date => date>=inicio && date<=cierre;
  const selected=tickets.filter(t=>within(t.fecha));
  const replaced=new Set(selected.map(t=>t.id_vencimiento_tarjeta).filter(Boolean));
  const items=[...selected.map(t=>({tipo:'ticket',id:String(t.id_ticket),fecha:t.fecha,descripcion:t.proveedor || `Ticket ${t.id_ticket}`,importe:Number(t.importe_total),id_vencimiento:t.id_vencimiento_tarjeta || null})),
    ...dues.filter(d=>within(d.fecha)&&!replaced.has(d.id)).map(d=>({tipo:'suscripcion',id:d.id,fecha:d.fecha,descripcion:d.descripcion || `Cargo ${d.id_cargo_recurrente}`,importe:Number(d.importe)}))];
  return {inicio,cierre,fecha,items,total:items.reduce((sum,item)=>sum+cents(item.importe),0)/100};
}
export function snapshotToken(value) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
