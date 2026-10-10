import {getPgPool} from '../../database/pgClient.js';
import {cardData} from './CardSettlementRepository.js';
import {periodForecast} from './LiquidacionesRepository.js';
import {nextPeriod} from './CardSettlement.js';
export async function cardForecastPeriods(from,until,db=getPgPool()){
 const cards=(await db.query("SELECT id_tarjeta FROM tesoreria_tarjetas WHERE estado='activa' AND proxima_liquidacion IS NOT NULL ORDER BY id_tarjeta")).rows,result=[];
 for(const c of cards){const data=await cardData(c.id_tarjeta,db),seen=new Set();let card=data.card;
  for(let n=0;n<1200&&card.proxima_liquidacion<=until;n++){
   const l=data.history.find(h=>h.fecha.slice(0,7)===card.proxima_liquidacion.slice(0,7)&&h.estado!=='anulada')||{inicio:card.inicio_periodo,cierre:card.proximo_cierre,fecha:card.proxima_liquidacion,detalle:{}};seen.add(l.fecha);
   if(l.fecha>=from&&l.estado!=='revisada')result.push({...periodForecast(data,l),bank:card.banco,cardId:card.id_tarjeta,cardName:card.nombre});card=nextPeriod(card);
  }
  for(const l of data.history.filter(l=>l.estado==='pendiente'&&l.fecha>=from&&l.fecha<=until&&!seen.has(l.fecha)))result.push({...periodForecast(data,l),bank:data.card.banco,cardId:data.card.id_tarjeta,cardName:data.card.nombre});
 }
 return result;
}
