import {cents} from './CardSettlement.js';

export function settlementChecks({settlement,lines,forecast,bankLines,tickets}) {
 const issues=[];
 const sum=lines.reduce((n,l)=>n+cents(l.importe),0),bank=bankLines.reduce((n,l)=>n-cents(l.importe),0);
 if(!lines.length)issues.push('Importa el PDF de la liquidación.');
 if(!bankLines.length)issues.push('Asocia el cargo total del extracto bancario.');
 if(sum!==cents(settlement.real))issues.push('El desglose no coincide con el total del PDF.');
 if(sum!==bank)issues.push('El PDF y el extracto bancario no coinciden exactamente.');
 const consumed=new Set();
 for(const l of lines){
  if(!['conciliado','sin_ticket'].includes(l.estado))issues.push(`Movimiento ${l.posicion}: pendiente de clasificar o recibir ticket.`);
  if(l.estado==='sin_ticket'&&!l.motivo.trim())issues.push(`Movimiento ${l.posicion}: explica por qué no hay ticket.`);
  if(l.estado==='sin_ticket'&&l.id_ticket)issues.push(`Movimiento ${l.posicion}: retira el ticket si no existe justificante.`);
  const refs=[l.id_ticket?`ticket:${l.id_ticket}`:null,l.id_vencimiento?`suscripcion:${l.id_vencimiento}`:null,l.id_otro?`otro:${l.id_otro}`:null].filter(Boolean);
  if(l.estado==='conciliado'&&!refs.length)issues.push(`Movimiento ${l.posicion}: selecciona su gasto previsto.`);
  for(const ref of refs){if(consumed.has(ref))issues.push('Un gasto se ha asociado dos veces.');consumed.add(ref);const item=forecast.items.find(i=>`${i.tipo}:${i.id}`===ref);if(!item||cents(item.importe)!==cents(l.importe))issues.push(`Movimiento ${l.posicion}: importe incompatible con la previsión.`);}
  if(l.id_ticket){const t=tickets.find(t=>String(t.id_ticket)===String(l.id_ticket));if(!t||t.clasificacion!=='asociable'||!['punteado','revisado'].includes(t.estado_revision))issues.push(`Ticket ${l.id_ticket}: pendiente de revisar.`);if(t?.id_vencimiento_tarjeta){const due=forecast.items.find(i=>i.id===String(t.id_ticket));if(!due?.subscriptionAmount||cents(due.subscriptionAmount)!==cents(t.importe_total))issues.push(`Ticket ${l.id_ticket}: no cuadra con su suscripción.`);}}
 }
 for(const i of forecast.items)if(!consumed.has(`${i.tipo}:${i.id}`))issues.push(`${i.descripcion}: previsión todavía sin resolver.`);
 if(sum!==cents(forecast.total))issues.push('Actualiza las previsiones para que recojan todos los movimientos reales, incluidos los gastos sin ticket justificados.');
 if(cents(settlement.previsto)!==sum&&!settlement.comentario?.trim())issues.push('Explica la desviación respecto a la previsión inicial.');
 return {issues:[...new Set(issues)],pdf:sum/100,banco:bank/100,diferencia:(sum-bank)/100,previsto:forecast.total};
}
