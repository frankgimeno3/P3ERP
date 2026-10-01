import { randomUUID } from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
import { ProveedorError, supplierTransaction } from './SupplierAdminRepository.js';
import { cents, isoDate, nextPeriod, settlementForecast, snapshotToken } from './CardSettlement.js';
import { insertRecurringCharge } from '../prevision/RecurringChargeRepository.js';

const fail=message=>{throw new ProveedorError(message,409);};
export async function getCardSettlement(id){
  const row=(await getPgPool().query("SELECT * FROM tesoreria_tarjetas_liquidaciones WHERE id=$1 AND estado='revisada'",[id])).rows[0];
  if(!row)throw new ProveedorError('Liquidación no encontrada o ya reabierta.',404);
  row.movimientos=(await getPgPool().query('SELECT id_linea_banco FROM tesoreria_tarjetas_movimientos WHERE id_liquidacion=$1 ORDER BY id_linea_banco',[id])).rows.map(r=>r.id_linea_banco);
  return row;
}
export async function cardData(id,db=getPgPool()) {
  const card=(await db.query("SELECT *,to_char(inicio_periodo,'YYYY-MM-DD') inicio_periodo,to_char(proximo_cierre,'YYYY-MM-DD') proximo_cierre,to_char(proxima_liquidacion,'YYYY-MM-DD') proxima_liquidacion FROM tesoreria_tarjetas WHERE id_tarjeta=$1",[id])).rows[0];
  if(!card)throw new ProveedorError('Tarjeta no encontrada.',404);
  for(const key of ['inicio_periodo','proximo_cierre','proxima_liquidacion'])card[key]=isoDate(card[key]);
  const tickets=(await db.query(`SELECT t.id_ticket,t.id_tarjeta,t.id_vencimiento_tarjeta,t.importe_total,t.documento_src,t.ambito,
    to_char(p3_income_date(t.fecha_ticket),'YYYY-MM-DD') fecha,COALESCE(p.nombre_proveedor,t.nombre_personalizado_proveedor) proveedor
    FROM administracion_tickets t LEFT JOIN administracion_proveedores p USING(id_proveedor) WHERE t.id_tarjeta=$1 ORDER BY p3_income_date(t.fecha_ticket),t.id_ticket`,[id])).rows;
  const charges=(await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_tarjeta=$1 AND activo ORDER BY id_cargo_recurrente',[id])).rows;
  const dues=(await db.query(`SELECT v.*,to_char(v.fecha,'YYYY-MM-DD') fecha FROM tesoreria_cargos_vencimientos v
    JOIN tesoreria_cargos_recurrentes c USING(id_cargo_recurrente) WHERE c.id_tarjeta=$1 AND c.activo
    AND NOT EXISTS(SELECT 1 FROM tesoreria_vencimientos_aplicaciones a WHERE a.id_vencimiento=v.id) ORDER BY v.fecha,v.id`,[id])).rows;
  const history=(await db.query(`SELECT l.*,to_char(l.inicio,'YYYY-MM-DD') inicio,to_char(l.cierre,'YYYY-MM-DD') cierre,to_char(l.fecha,'YYYY-MM-DD') fecha,COALESCE((SELECT jsonb_agg(m.id_linea_banco ORDER BY m.id_linea_banco) FROM tesoreria_tarjetas_movimientos m WHERE m.id_liquidacion=l.id),'[]'::jsonb) movimientos
    FROM tesoreria_tarjetas_liquidaciones l WHERE id_tarjeta=$1 ORDER BY created_at DESC,id`,[id])).rows;
  return {card,tickets,charges,dues,history,next:settlementForecast(card,tickets,dues)};
}

export async function associateCardCharge(id,body) {
  return supplierTransaction(async db=>{
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    const data=await cardData(id,db);
    if(!data.next||data.card.estado!=='activa')fail('Configura primero el calendario de una tarjeta activa.');
    const charge=body.action==='create'?await insertRecurringCharge(db,{...body,banco_pago:data.card.banco}):(await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1 FOR UPDATE',[body.id_cargo_recurrente])).rows[0];
    if(!charge||!charge.activo||charge.tipo_cargo==='nomina')fail('Selecciona un cargo activo de proveedor u Otro.');
    if(charge.id_tarjeta&&charge.id_tarjeta!==id)fail('El cargo ya pertenece a otra tarjeta.');
    if(body.remove&&charge.id_tarjeta!==id)fail('El cargo no pertenece a esta tarjeta.');
    if(body.remove&&(await db.query("SELECT 1 FROM tesoreria_tarjetas_liquidaciones l,jsonb_array_elements(l.detalle->'charges') c WHERE l.id_tarjeta=$1 AND l.estado='revisada' AND c->>'id_cargo_recurrente'=$2 LIMIT 1",[id,String(charge.id_cargo_recurrente)])).rowCount)fail('Este cargo tiene liquidaciones guardadas. Conserva la asociación y finaliza su programación para darlo de baja.');
    if((await db.query('SELECT 1 FROM tesoreria_vencimientos_aplicaciones a JOIN tesoreria_cargos_vencimientos v ON v.id=a.id_vencimiento WHERE v.id_cargo_recurrente=$1 AND v.fecha >= $2::date LIMIT 1',[charge.id_cargo_recurrente,data.card.inicio_periodo])).rowCount)fail('Hay vencimientos ya pagados por banco en este período. Revisa su asociación antes de usar la tarjeta.');
    if(body.remove&&(await db.query('SELECT 1 FROM administracion_tickets t JOIN tesoreria_cargos_vencimientos v ON v.id=t.id_vencimiento_tarjeta WHERE v.id_cargo_recurrente=$1 LIMIT 1',[charge.id_cargo_recurrente])).rowCount)fail('Desvincula primero los tickets de esta suscripción.');
    await db.query('UPDATE tesoreria_cargos_recurrentes SET id_tarjeta=$2,updated_at=now() WHERE id_cargo_recurrente=$1',[charge.id_cargo_recurrente,body.remove?null:id]);
    return {ok:true};
  });
}

export async function associateCardTicket(id,body) {
  return supplierTransaction(async db=>{
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    const {card,next}=await cardData(id,db);
    if(!next||card.estado!=='activa')fail('Configura el calendario de una tarjeta activa.');
    const ticket=(await db.query("SELECT *,to_char(p3_income_date(fecha_ticket),'YYYY-MM-DD') fecha FROM administracion_tickets WHERE id_ticket=$1 FOR UPDATE",[body.id_ticket])).rows[0];
    if(!ticket||ticket.fecha<next.inicio)fail('Selecciona un ticket del período abierto o posterior.');
    if(ticket.id_tarjeta&&ticket.id_tarjeta!==id)fail('El ticket pertenece a otra tarjeta.');
    if(body.id_vencimiento_tarjeta){
      const due=(await db.query('SELECT v.*,to_char(v.fecha,\'YYYY-MM-DD\') fecha FROM tesoreria_cargos_vencimientos v JOIN tesoreria_cargos_recurrentes c USING(id_cargo_recurrente) WHERE v.id=$1 AND c.id_tarjeta=$2 AND c.activo',[body.id_vencimiento_tarjeta,id])).rows[0];
      if(!due||due.fecha<next.inicio||due.fecha>next.cierre||ticket.fecha>next.cierre)fail('El ticket y el vencimiento deben pertenecer a la próxima liquidación.');
    }
    await db.query("UPDATE administracion_tickets SET forma_pago='tarjeta',id_tarjeta=$2,tarjeta_ultimos_digitos=$3,tarjeta_banco=$4,tarjeta_nombre=$5,tarjeta_tipo=$6,id_vencimiento_tarjeta=$7 WHERE id_ticket=$1",[ticket.id_ticket,id,card.ultimos_digitos,card.banco,card.nombre,card.tipo,body.id_vencimiento_tarjeta||null]);
    return {ok:true};
  });
}

export async function settleCard(id,body,actor='') {
  return supplierTransaction(async db=>{
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    const ids=Array.isArray(body.ids)?[...new Set(body.ids)]:[];
    if(!ids.length||ids.length>100)fail('Selecciona entre 1 y 100 movimientos de una misma liquidación.');
    await db.query('SELECT id_tarjeta FROM tesoreria_tarjetas WHERE id_tarjeta=$1 FOR UPDATE',[id]);
    const data=await cardData(id,db),forecast=data.next;
    if(!forecast||data.card.estado!=='activa')fail('Configura una tarjeta activa antes de liquidar.');
    const lines=(await db.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=ANY($1::text[]) ORDER BY id_linea_banco FOR UPDATE',[ids])).rows;
    if(lines.length!==ids.length||lines.some(l=>l.estado_revision||Number(l.importe)>=0||l.banco!==data.card.banco||l.id_proveedor||l.id_cuenta||l.id_agente||l.id_pago||l.id_orden||l.id_cargo_recurrente))fail('Selecciona cargos sin revisar ni asignar, del banco de la tarjeta.');
    const linked=(await db.query(`SELECT id_linea_banco FROM tesoreria_tarjetas_movimientos WHERE id_linea_banco=ANY($1::text[])
      UNION ALL SELECT id_transferencia FROM laboral_nominas WHERE id_transferencia=ANY($1::text[])
      UNION ALL SELECT id_transferencia FROM laboral_anticipos WHERE id_transferencia=ANY($1::text[])
      UNION ALL SELECT id_linea_banco FROM tesoreria_vencimientos_aplicaciones WHERE id_linea_banco=ANY($1::text[])
      UNION ALL SELECT id_linea_banco FROM tesoreria_aplicaciones_cobro WHERE id_linea_banco=ANY($1::text[])`,[ids])).rowCount;
    if(linked)fail('Un movimiento ya tiene pagos o una liquidación asociados.');
    const real=lines.reduce((sum,l)=>sum+Math.abs(cents(l.importe)),0)/100;
    const token=snapshotToken({card:data.card,forecast,lines,charges:data.charges});
    const preview={...forecast,real,diferencia:(cents(real)-cents(forecast.total))/100,token,movimientos:lines.map(l=>({id:l.id_linea_banco,concepto:l.concepto,importe:l.importe,fecha:l.fecha_valor}))};
    if(body.action==='preview')return preview;
    if(body.action!=='confirm'||body.token!==token)fail('La previsión o los movimientos han cambiado. Revisa de nuevo antes de confirmar.');
    const comment=String(body.comentario||'').trim();
    if(comment.length>10000||preview.diferencia!==0&&!comment)fail('Explica la diferencia entre el cargo bancario y la previsión.');
    const settlementId=randomUUID();
    await db.query(`INSERT INTO tesoreria_tarjetas_liquidaciones(id,id_tarjeta,inicio,cierre,fecha,previsto,real,detalle,comentario,actor)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)`,[settlementId,id,forecast.inicio,forecast.cierre,forecast.fecha,forecast.total,real,JSON.stringify({...preview,card:data.card,charges:data.charges}),comment,actor]);
    for(const line of lines)await db.query('INSERT INTO tesoreria_tarjetas_movimientos(id_linea_banco,id_liquidacion) VALUES($1,$2)',[line.id_linea_banco,settlementId]);
    await db.query('UPDATE tesoreria_movimientos_bancarios SET estado_revision=true,updated_at=now() WHERE id_linea_banco=ANY($1::text[])',[ids]);
    const next=nextPeriod(data.card);
    await db.query('UPDATE tesoreria_tarjetas SET inicio_periodo=$2,proximo_cierre=$3,proxima_liquidacion=$4,updated_at=now() WHERE id_tarjeta=$1',[id,next.inicio_periodo,next.proximo_cierre,next.proxima_liquidacion]);
    return {ok:true,id:settlementId};
  });
}

export async function reopenCardSettlements(db,ids) {
  const settlements=(await db.query('SELECT DISTINCT l.* FROM tesoreria_tarjetas_liquidaciones l JOIN tesoreria_tarjetas_movimientos m ON m.id_liquidacion=l.id WHERE m.id_linea_banco=ANY($1::text[])',[ids])).rows;
  for(const l of settlements){
    const members=(await db.query('SELECT id_linea_banco FROM tesoreria_tarjetas_movimientos WHERE id_liquidacion=$1',[l.id])).rows;
    if(members.some(m=>!ids.includes(m.id_linea_banco)))fail('Selecciona todos los movimientos de la liquidación para reabrirla.');
    if((await db.query("SELECT 1 FROM tesoreria_tarjetas_liquidaciones WHERE id_tarjeta=$1 AND estado='revisada' AND cierre>$2",[l.id_tarjeta,l.cierre])).rowCount)fail('Solo se puede reabrir la última liquidación de cada tarjeta.');
    await db.query('UPDATE tesoreria_tarjetas SET inicio_periodo=$2,proximo_cierre=$3,proxima_liquidacion=$4,updated_at=now() WHERE id_tarjeta=$1',[l.id_tarjeta,l.inicio,l.cierre,l.fecha]);
    await db.query("UPDATE tesoreria_tarjetas_liquidaciones SET estado='anulada' WHERE id=$1",[l.id]);
    await db.query('DELETE FROM tesoreria_tarjetas_movimientos WHERE id_liquidacion=$1',[l.id]);
  }
}

export async function cardLiquidity(from,until,db=getPgPool()) {
  const cards=(await db.query("SELECT id_tarjeta FROM tesoreria_tarjetas WHERE proxima_liquidacion IS NOT NULL ORDER BY id_tarjeta")).rows;
  const totals={Sabadell:0,Santander:0};
  for(const {id_tarjeta} of cards){
    const data=await cardData(id_tarjeta,db);
    let card=data.card;
    for(let n=0;n<1200&&card.proxima_liquidacion<=until;n++){
      const forecast=settlementForecast(card,data.tickets,data.dues);
      if(forecast.fecha>=from)totals[card.banco]=(totals[card.banco]||0)+cents(forecast.total);
      card=nextPeriod(card);
    }
  }
  return Object.fromEntries(Object.entries(totals).map(([key,value])=>[key,value/100]));
}
