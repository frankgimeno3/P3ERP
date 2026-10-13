import {randomUUID} from 'node:crypto';
import {getPgPool} from '../../database/pgClient.js';
import {supplierTransaction,ProveedorError} from './SupplierAdminRepository.js';
import {cardData} from './CardSettlementRepository.js';
import {cents,isoDate,validDate,nextPeriod,settlementForecast} from './CardSettlement.js';
import {settlementChecks} from './SettlementChecks.js';
import {extractCardStatement} from './CardStatementPdf.js';
const fail=(m,status=409)=>{throw new ProveedorError(m,status);};
const lock=async db=>db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
const clean=row=>({...row,inicio:isoDate(row.inicio),cierre:isoDate(row.cierre),fecha:isoDate(row.fecha)});
async function read(db,id,forUpdate=false){const row=(await db.query(`SELECT *,to_char(mes_extracto,'YYYY-MM-DD') mes_extracto,to_char(inicio,'YYYY-MM-DD') inicio,to_char(cierre,'YYYY-MM-DD') cierre,to_char(fecha,'YYYY-MM-DD') fecha FROM tesoreria_tarjetas_liquidaciones WHERE id=$1 ${forUpdate?'FOR UPDATE':''}`,[id])).rows[0];if(!row)fail('Liquidación no encontrada.',404);return clean(row);}
export function periodForecast(data,l){
 let start=l.inicio;if(data.history.some(h=>h.estado!=='anulada'&&h.fecha<l.fecha&&h.cierre===l.inicio)){const d=new Date(start);d.setUTCDate(d.getUTCDate()+1);start=isoDate(d);}
 const f=settlementForecast({...data.card,id_liquidacion:l.id,inicio_periodo:start,proximo_cierre:l.cierre,proxima_liquidacion:l.fecha},data.tickets.filter(t=>t.clasificacion!=='no_asociable'&&t.forma_pago==='tarjeta'),data.dues);
 const omitted=new Set(l.detalle?.omitidos||[]);f.items=f.items.filter(i=>!omitted.has(`${i.tipo}:${i.id}`));
 for(const i of f.items){if(i.id_vencimiento)i.subscriptionAmount=Number(data.dues.find(d=>d.id===i.id_vencimiento)?.importe);}
 f.items.push(...(l.detalle?.otros||[]).map(i=>({...i,tipo:'otro'})));f.total=f.items.reduce((n,i)=>n+cents(i.importe),0)/100;return f;
}
export async function createLiquidacion(cardId,body){return supplierTransaction(async db=>{await lock(db);const d=await cardData(cardId,db);const p={inicio:body.inicio||d.next?.inicio,cierre:body.cierre||d.next?.cierre,fecha:body.fecha||d.next?.fecha};if(!Object.values(p).every(validDate)||p.inicio>p.cierre||p.cierre>p.fecha)fail('Completa el período y la fecha de cargo en orden.',422);
 const existing=(await db.query("SELECT id FROM tesoreria_tarjetas_liquidaciones WHERE id_tarjeta=$1 AND fecha=$2::date AND estado<>'anulada'",[cardId,p.fecha])).rows[0];if(existing)return existing;
 if((await db.query("SELECT 1 FROM tesoreria_tarjetas_liquidaciones WHERE id_tarjeta=$1 AND estado<>'anulada' AND inicio<$3::date AND cierre>$2::date",[cardId,p.inicio,p.cierre])).rowCount)fail('El período se solapa con otra liquidación.');
 const forecast=periodForecast(d,{...p,detalle:{}}),id=randomUUID();await db.query("INSERT INTO tesoreria_tarjetas_liquidaciones(id,id_tarjeta,inicio,cierre,fecha,previsto,real,detalle,estado) VALUES($1,$2,$3,$4,$5,$6,NULL,'{}','pendiente')",[id,cardId,p.inicio,p.cierre,p.fecha,forecast.total]);return {id};});}
export async function getLiquidacion(id,db=getPgPool()){
 const l=await read(db,id),data=await cardData(l.id_tarjeta,db);
 const lines=(await db.query("SELECT *,to_char(fecha,'YYYY-MM-DD') fecha,to_char(fecha_valor,'YYYY-MM-DD') fecha_valor FROM tesoreria_tarjetas_lineas WHERE id_liquidacion=$1 ORDER BY posicion",[id])).rows;
 const bankLines=(await db.query('SELECT b.* FROM tesoreria_movimientos_bancarios b JOIN tesoreria_tarjetas_movimientos m USING(id_linea_banco) WHERE m.id_liquidacion=$1 ORDER BY id_linea_banco',[id])).rows;
 const candidates=data.card.tipo==='personal'?[]:(await db.query(`SELECT b.* FROM tesoreria_movimientos_bancarios b WHERE banco=$1 AND importe<0 AND NOT estado_revision AND NOT COALESCE(duplicado_descartado,false) AND NOT EXISTS(SELECT 1 FROM tesoreria_tarjetas_movimientos m WHERE m.id_linea_banco=b.id_linea_banco) AND COALESCE(p3_income_date(fecha_operativa),p3_income_date(fecha_valor)) BETWEEN $2::date-interval '15 days' AND $2::date+interval '15 days' ORDER BY id_linea_banco`,[data.card.banco,l.fecha])).rows;
 const forecast=l.estado==='revisada'&&Array.isArray(l.detalle?.items)?{inicio:l.inicio,cierre:l.cierre,fecha:l.fecha,items:l.detalle.items,total:Number(l.detalle.total??l.previsto)}:periodForecast(data,l),document=(await db.query('SELECT nombre,sha256,extraccion FROM tesoreria_tarjetas_documentos WHERE id_liquidacion=$1',[id])).rows[0];
 return {settlement:l,card:data.card,lines,forecast,tickets:data.tickets,bankLines,candidates,document,checks:settlementChecks({settlement:l,lines,forecast,bankLines,tickets:data.tickets,personal:data.card.tipo==='personal'})};
}
export async function importLiquidacion(id,file,bank,version,commit=false){
 const parsed=await extractCardStatement(file,bank);
 return supplierTransaction(async db=>{await lock(db);const l=await read(db,id,true),data=await cardData(l.id_tarjeta,db);
 if(l.estado!=='pendiente'||Number(version)!==l.version)fail('La liquidación ha cambiado. Recarga antes de importar.');
 validateStatementCard(data.card,parsed);
 if((await db.query('SELECT 1 FROM tesoreria_tarjetas_documentos WHERE sha256=$1',[parsed.sha256])).rowCount)fail('Este PDF ya está importado.');
 if((await db.query('SELECT 1 FROM tesoreria_tarjetas_lineas WHERE id_liquidacion=$1',[id])).rowCount)fail('La liquidación ya tiene un PDF importado; conserva su conciliación.');
 if((await db.query("SELECT 1 FROM tesoreria_tarjetas_liquidaciones WHERE id<>$1 AND id_tarjeta=$2 AND estado<>'anulada' AND (fecha=$3::date OR inicio<$5::date AND cierre>$4::date)",[id,l.id_tarjeta,parsed.fecha,parsed.inicio,parsed.cierre])).rowCount)fail('El PDF se solapa con otra liquidación.');
 const {bytes,...preview}=parsed;if(!commit)return preview;
 await db.query('INSERT INTO tesoreria_tarjetas_documentos(id_liquidacion,nombre,sha256,contenido,extraccion) VALUES($1,$2,$3,$4,$5::jsonb)',[id,parsed.nombre,parsed.sha256,bytes,JSON.stringify(preview)]);
 for(const [n,r]of parsed.rows.entries())await db.query('INSERT INTO tesoreria_tarjetas_lineas(id,id_liquidacion,posicion,fecha,fecha_valor,concepto,importe) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),id,n+1,r.fecha,r.fecha_valor,r.concepto,r.importe]);
 await db.query('UPDATE tesoreria_tarjetas_liquidaciones SET inicio=$2,cierre=$3,fecha=$4,real=$5,version=version+1,updated_at=now() WHERE id=$1',[id,parsed.inicio,parsed.cierre,parsed.fecha,parsed.total]);return {ok:true};});
}
export function validateStatementCard(card,parsed){
 if(card.banco!==parsed.banco)fail('El banco de cargo del PDF no corresponde a la tarjeta.');
 if(parsed.formato==='carrefour_pass'){
  if(card.tipo!=='personal'||!card.referencia_extracto||card.referencia_extracto!==parsed.referencia)fail('El cliente PASS no corresponde a esta tarjeta personal.');
 }else if(parsed.ultimos_digitos!==card.ultimos_digitos||(card.tipo==='personal'&&(!card.referencia_extracto||card.referencia_extracto!==parsed.referencia)))fail('La tarjeta o contrato del PDF no corresponde a la tarjeta seleccionada.');
 if(card.tipo==='p3'&&parsed.formato==='santander_personal')fail('El extracto es personal; no se puede importar como tarjeta de empresa.');
}
export async function personalStatementStatus(cardId,month,db=getPgPool()){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))fail('Selecciona un mes y año válidos.',422);
 const existing=(await db.query("SELECT l.id,l.estado,d.nombre,EXISTS(SELECT 1 FROM tesoreria_tarjetas_documentos d WHERE d.id_liquidacion=l.id) importada FROM tesoreria_tarjetas_liquidaciones l LEFT JOIN tesoreria_tarjetas_documentos d ON d.id_liquidacion=l.id WHERE l.id_tarjeta=$1 AND l.estado<>'anulada' AND COALESCE(l.mes_extracto,date_trunc('month',l.cierre)::date)=$2::date",[cardId,month+'-01'])).rows[0];
 return existing||{importada:false};
}
export async function importPersonalStatement(cardId,file,format,month,commit=false){
 const parsed=await extractCardStatement(file,format);
 if(parsed.mes_extracto!==month)fail(`El PDF corresponde a ${parsed.mes_extracto}, no a ${month}. Selecciona el mes del cierre, no el del cargo.`,422);
 return supplierTransaction(async db=>{
  await lock(db);const data=await cardData(cardId,db);if(data.card.tipo!=='personal')fail('Selecciona una tarjeta personal.',422);
  validateStatementCard(data.card,parsed);
  const status=await personalStatementStatus(cardId,month,db);if(status.importada)fail('Este mes ya está importado. Abre su liquidación para continuar el punteo.');
  if((await db.query('SELECT 1 FROM tesoreria_tarjetas_documentos WHERE sha256=$1',[parsed.sha256])).rowCount)fail('Este PDF ya está importado.');
  if((await db.query("SELECT 1 FROM tesoreria_tarjetas_liquidaciones WHERE id_tarjeta=$1 AND estado<>'anulada' AND ($2::text IS NULL OR id::text<>$2) AND inicio<$4::date AND cierre>$3::date",[cardId,status.id||null,parsed.inicio,parsed.cierre])).rowCount)fail('El periodo se solapa con otra liquidación.');
  const {bytes,...preview}=parsed;if(!commit)return preview;
  const id=status.id||randomUUID();
  if(status.id){const l=await read(db,id,true);if(l.estado!=='pendiente')fail('Esta liquidación no admite una nueva importación.');await db.query('UPDATE tesoreria_tarjetas_liquidaciones SET inicio=$2,cierre=$3,fecha=$4,mes_extracto=$5 WHERE id=$1',[id,parsed.inicio,parsed.cierre,parsed.fecha,month+'-01']);}
  else {const forecast=periodForecast(data,{inicio:parsed.inicio,cierre:parsed.cierre,fecha:parsed.fecha,detalle:{}});await db.query("INSERT INTO tesoreria_tarjetas_liquidaciones(id,id_tarjeta,inicio,cierre,fecha,mes_extracto,previsto,detalle,estado) VALUES($1,$2,$3,$4,$5,$6,$7,'{}','pendiente')",[id,cardId,parsed.inicio,parsed.cierre,parsed.fecha,month+'-01',forecast.total]);}
  await db.query('INSERT INTO tesoreria_tarjetas_documentos(id_liquidacion,nombre,sha256,contenido,extraccion) VALUES($1,$2,$3,$4,$5::jsonb)',[id,parsed.nombre,parsed.sha256,bytes,JSON.stringify(preview)]);
  for(const [n,r] of parsed.rows.entries())await db.query('INSERT INTO tesoreria_tarjetas_lineas(id,id_liquidacion,posicion,fecha,fecha_valor,concepto,importe) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),id,n+1,r.fecha,r.fecha_valor,r.concepto,r.importe]);
  await db.query('UPDATE tesoreria_tarjetas_liquidaciones SET real=$2,version=version+1,updated_at=now() WHERE id=$1',[id,parsed.total]);return {id};
 });
}
export async function saveLiquidacion(id,body,actor=''){return supplierTransaction(async db=>{
 await lock(db);const l=await read(db,id,true);if(l.estado!=='pendiente'||Number(body.version)!==l.version)fail('La liquidación ha cambiado. Recarga antes de guardar.');
 const lines=(await db.query("SELECT *,to_char(fecha,'YYYY-MM-DD') fecha,to_char(fecha_valor,'YYYY-MM-DD') fecha_valor FROM tesoreria_tarjetas_lineas WHERE id_liquidacion=$1 ORDER BY posicion FOR UPDATE",[id])).rows;
 if(!Array.isArray(body.lines)||body.lines.length!==lines.length||new Set(body.lines.map(r=>r.id)).size!==lines.length)fail('Envía todos los movimientos sin duplicarlos.');
 const data=await cardData(l.id_tarjeta,db),other=body.otros||[],omitted=body.omitidos||[];
 const personal=data.card.tipo==='personal';
 const actualDate=o=>personal&&body.lines.some(r=>r.id_otro===o.id&&lines.some(original=>original.id===r.id&&[original.fecha,original.fecha_valor].includes(o.fecha)));
 if(!Array.isArray(other)||other.length>500||other.some(o=>!o.id||!String(o.descripcion||'').trim()||!Number.isFinite(Number(o.importe))||Math.abs(Number(o.importe))>9999999999||!validDate(o.fecha)||((o.fecha<l.inicio||o.fecha>l.cierre)&&!actualDate(o)))||new Set(other.map(o=>o.id)).size!==other.length)fail('Revisa los otros gastos previstos.',422);
 if(!Array.isArray(omitted)||omitted.some(s=>!/^suscripcion:/.test(s))||omitted.length&&!String(body.comentario||'').trim())fail('Explica los vencimientos que no se han cargado.');
 l.detalle={...l.detalle,otros:other,omitidos:omitted};const forecast=periodForecast(data,l);
 for(const edited of body.lines){const original=lines.find(r=>r.id===edited.id);if(!original||!['pendiente','conciliado','pendiente_ticket','sin_ticket'].includes(edited.estado))fail('Movimiento o estado no válido.');
  const ticket=edited.id_ticket?data.tickets.find(t=>String(t.id_ticket)===String(edited.id_ticket)):null;
  if(edited.id_ticket&&(!ticket||!forecast.items.some(i=>i.tipo==='ticket'&&i.id===String(ticket.id_ticket))))fail('El ticket no pertenece a esta tarjeta y período.');
  if(edited.id_vencimiento&&!forecast.items.some(i=>i.tipo==='suscripcion'&&i.id===edited.id_vencimiento))fail('Vencimiento no disponible.');
  if(edited.id_otro&&!other.some(o=>o.id===edited.id_otro))fail('Otro gasto no disponible.');
  if([edited.id_ticket,edited.id_vencimiento,edited.id_otro].filter(Boolean).length>1)fail('Selecciona un solo gasto por movimiento. El ticket de suscripción conserva su vínculo.');
  if(edited.estado==='sin_ticket'&&edited.id_ticket)fail('Retira el ticket antes de indicar que no existe justificante.');
 }
 const ref=r=>[r.id_ticket,r.id_vencimiento,r.id_otro].map(v=>v?String(v):'').join('|');
 const changed=body.lines.filter(edited=>{const original=lines.find(r=>r.id===edited.id);return original.estado!==edited.estado||original.motivo!==String(edited.motivo||'').slice(0,3000)||ref(original)!==ref(edited);});
 const changedRefs=changed.filter(r=>ref(lines.find(original=>original.id===r.id))!==ref(r)).map(r=>r.id);
 if(changedRefs.length)await db.query('UPDATE tesoreria_tarjetas_lineas SET id_ticket=NULL,id_vencimiento=NULL,id_otro=NULL WHERE id=ANY($1::text[])',[changedRefs]);
 for(const edited of changed)await db.query('UPDATE tesoreria_tarjetas_lineas SET estado=$2,motivo=$3,id_ticket=$4,id_vencimiento=$5,id_otro=$6 WHERE id=$1',[edited.id,edited.estado,String(edited.motivo||'').slice(0,3000),edited.id_ticket||null,edited.id_vencimiento||null,edited.id_otro||null]);
 const ids=Array.isArray(body.bankIds)?[...new Set(body.bankIds)]:[];if(ids.length>30)fail('Demasiados cargos bancarios.');
 if(personal&&(ids.length||(await db.query('SELECT 1 FROM tesoreria_tarjetas_movimientos WHERE id_liquidacion=$1',[id])).rowCount))fail('Las tarjetas personales no pueden asociarse a extractos bancarios de empresa.');
 const banks=(await db.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=ANY($1::text[]) FOR UPDATE',[ids])).rows;
 if(banks.length!==ids.length||banks.some(b=>b.banco!==data.card.banco||Number(b.importe)>=0||b.estado_revision||b.duplicado_descartado||b.id_proveedor||b.id_cuenta||b.id_agente||b.id_pago||b.id_orden||b.id_cargo_recurrente))fail('Selecciona cargos disponibles del banco de la tarjeta.');
 if((await db.query(`SELECT 1 FROM tesoreria_tarjetas_movimientos WHERE id_linea_banco=ANY($1::text[]) AND id_liquidacion<>$2 UNION ALL SELECT 1 FROM tesoreria_vencimientos_aplicaciones WHERE id_linea_banco=ANY($1::text[]) UNION ALL SELECT 1 FROM tesoreria_aplicaciones_cobro WHERE id_linea_banco=ANY($1::text[]) UNION ALL SELECT 1 FROM laboral_nominas WHERE id_transferencia=ANY($1::text[]) UNION ALL SELECT 1 FROM laboral_anticipos WHERE id_transferencia=ANY($1::text[])`,[ids,id])).rowCount)fail('Un cargo ya tiene otra asociación.');
 await db.query('DELETE FROM tesoreria_tarjetas_movimientos WHERE id_liquidacion=$1',[id]);for(const b of banks)await db.query('INSERT INTO tesoreria_tarjetas_movimientos(id_linea_banco,id_liquidacion) VALUES($1,$2)',[b.id_linea_banco,id]);
 l.comentario=String(body.comentario||'').slice(0,10000);await db.query('UPDATE tesoreria_tarjetas_liquidaciones SET detalle=$2::jsonb,comentario=$3,version=version+1,updated_at=now() WHERE id=$1',[id,JSON.stringify(l.detalle),l.comentario]);
 if(body.action==='review'){
  const fresh=await getLiquidacion(id,db);if(!fresh.document)fail('Importa el documento bancario original.');if(fresh.checks.issues.length)fail(fresh.checks.issues.join('\n'));
  await db.query("UPDATE tesoreria_tarjetas_liquidaciones SET estado='revisada',detalle=detalle||$2::jsonb,actor=$3 WHERE id=$1",[id,JSON.stringify({card:data.card,items:fresh.forecast.items,total:fresh.forecast.total,movimientos:fresh.bankLines.map(b=>({id:b.id_linea_banco,importe:b.importe}))}),actor]);
  await db.query('UPDATE tesoreria_movimientos_bancarios SET estado_revision=true,updated_at=now() WHERE id_linea_banco=ANY($1::text[])',[ids]);
  await db.query("UPDATE administracion_tickets SET estado_revision='revisado',updated_at=now() WHERE id_ticket IN (SELECT id_ticket FROM tesoreria_tarjetas_lineas WHERE id_liquidacion=$1)",[id]);
  if(data.card.proximo_cierre===l.cierre){const next=nextPeriod(data.card);await db.query('UPDATE tesoreria_tarjetas SET inicio_periodo=$2,proximo_cierre=$3,proxima_liquidacion=$4,updated_at=now() WHERE id_tarjeta=$1',[l.id_tarjeta,next.inicio_periodo,next.proximo_cierre,next.proxima_liquidacion]);}
 }
 return getLiquidacion(id,db);
});}
export async function getLiquidacionFile(id){const r=(await getPgPool().query('SELECT nombre,contenido FROM tesoreria_tarjetas_documentos WHERE id_liquidacion=$1',[id])).rows[0];if(!r)fail('Documento no encontrado.',404);return new Response(r.contenido,{headers:{'Content-Type':'application/pdf','Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(r.nombre).replaceAll("'",'%27')}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':'sandbox'}});}
