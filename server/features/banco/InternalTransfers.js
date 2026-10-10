import {randomUUID} from 'node:crypto';
import {getPgPool} from '../../database/pgClient.js';
import {lockIncome} from '../prevision/IncomeReconciliation.js';
import {dateISO} from './BankReviewAnalysis.js';
const fail=message=>{throw Object.assign(Error(message),{status:409});};
const cents=value=>Math.round(Number(value)*100);
const day=line=>dateISO(line.fecha_operativa||line.fecha_valor);
export const ownTransferConcept=line=>/transferencia (?:inmediata )?(?:a |de )proporci[oó]n\s*3\b/i.test(line.concepto||'');
export function matchingTransferLines(line,other) {
  const a=day(line),b=day(other);
  return Boolean(a&&b&&line.id_linea_banco!==other.id_linea_banco&&line.banco!==other.banco
    &&['Sabadell','Santander'].includes(line.banco)&&['Sabadell','Santander'].includes(other.banco)
    &&cents(line.importe)!==0&&cents(line.importe)===-cents(other.importe)
    &&Math.abs(Date.parse(a)-Date.parse(b))<=3*86400000&&!other.duplicado_descartado&&!line.duplicado_descartado);
}
export async function readInternalTransfers(db=getPgPool()) {
  if(!(await db.query("SELECT to_regclass('tesoreria_traspasos_propios') name")).rows[0].name)return [];
  return (await db.query("SELECT t.*,to_char(t.fecha,'YYYY-MM-DD') fecha FROM tesoreria_traspasos_propios t ORDER BY t.fecha,t.id")).rows;
}
export async function transferReviewOptions(id,db=getPgPool()) {
  const line=(await db.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=$1',[id])).rows[0];
  if(!line)fail('Movimiento no encontrado.');
  const all=(await db.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE banco<>$1 AND importe=-$2::numeric AND NOT duplicado_descartado',[line.banco,line.importe])).rows;
  const transfers=await readInternalTransfers(db);
  const current=transfers.find(t=>[t.id_linea_cargo,t.id_linea_abono].includes(id));
  const candidates=all.filter(other=>matchingTransferLines(line,other)&&!transfers.some(t=>t.id!==current?.id&&t.id_linea_cargo&&t.id_linea_abono&&[t.id_linea_cargo,t.id_linea_abono].includes(other.id_linea_banco)));
  return {line,current,candidates,plans:transfers.filter(t=>t.estado==='previsto'&&cents(t.importe)===Math.abs(cents(line.importe))&&
    (Number(line.importe)<0?t.banco_origen===line.banco:t.banco_destino===line.banco))};
}
async function noBusinessAssociation(db,lines) {
  for(const l of lines)if(l.id_proveedor||l.id_cuenta||l.id_agente||l.id_pago||l.id_orden||l.id_cargo_recurrente||l.nomina_revision)fail('El movimiento tiene una asociación comercial o de gasto. Retírala antes de identificarlo como traspaso propio.');
  const ids=lines.map(l=>l.id_linea_banco);
  for(const table of ['tesoreria_aplicaciones_cobro','tesoreria_vencimientos_aplicaciones','tesoreria_tarjetas_movimientos'])
    if((await db.query(`SELECT 1 FROM ${table} WHERE id_linea_banco=ANY($1::text[]) LIMIT 1`,[ids])).rowCount)fail('Existe una aplicación a cobros, gastos o tarjetas. Revísala antes de cambiarla a traspaso propio.');
}
// Caller owns the transaction; bank row locks use the same order as the wizard.
export async function reviewInternalTransfer(db,body,actor='') {
  if(!body.id||typeof body.reason!=='string'||!body.reason.trim()||body.reason.length>3000)fail('Confirma el movimiento y el motivo del traspaso propio.');
  const ids=[...new Set([body.id,body.counterpartId].filter(Boolean))].sort();
  if(body.counterpartId===body.id)fail('La contrapartida debe ser otro movimiento.');
  const lines=(await db.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=ANY($1::text[]) ORDER BY id_linea_banco FOR UPDATE',[ids])).rows;
  if(lines.length!==ids.length)fail('Un movimiento ya no existe.');
  for(const line of lines)if(!body.versions?.[line.id_linea_banco]||new Date(body.versions[line.id_linea_banco]).getTime()!==new Date(line.updated_at).getTime())fail('Un movimiento ha cambiado. Recarga antes de confirmar.');
  const line=lines.find(l=>l.id_linea_banco===body.id),other=lines.find(l=>l.id_linea_banco!==body.id);
  if(!day(line)||!['Sabadell','Santander'].includes(line.banco)||!cents(line.importe)||line.duplicado_descartado)fail('Revisa la fecha, banco e importe del traspaso.');
  if(other&&!matchingTransferLines(line,other))fail('Los bancos, fechas, signos o importes no permiten emparejar estos movimientos.');
  if(!other&&!body.allowUnpaired)fail('Selecciona la contrapartida o confirma que todavía falta su extracto.');
  await noBusinessAssociation(db,lines);
  const linked=(await db.query('SELECT * FROM tesoreria_traspasos_propios WHERE id_linea_cargo=ANY($1::text[]) OR id_linea_abono=ANY($1::text[]) ORDER BY id FOR UPDATE',[ids])).rows;
  if(linked.length>1)fail('Los movimientos pertenecen a traspasos diferentes.');
  const previous=linked[0];
  if(previous&&[previous.id_linea_cargo,previous.id_linea_abono].filter(Boolean).some(id=>!ids.includes(id)))fail('Incluye también la contrapartida ya asociada para revisar el traspaso completo.');
  const cargo=lines.find(l=>Number(l.importe)<0)?.id_linea_banco||previous?.id_linea_cargo||null;
  const abono=lines.find(l=>Number(l.importe)>0)?.id_linea_banco||previous?.id_linea_abono||null;
  if(previous&&[previous.id_linea_cargo,previous.id_linea_abono].filter(Boolean).some(id=>![cargo,abono].includes(id)))fail('Este traspaso ya tiene otra contrapartida.');
  if(previous&&other&&[previous.id_linea_cargo,previous.id_linea_abono].filter(Boolean).some(id=>!ids.includes(id)))fail('No se puede sustituir una contrapartida ya asociada.');
  const source=Number(line.importe)<0?line.banco:other?.banco||(line.banco==='Sabadell'?'Santander':'Sabadell');
  const destination=source==='Sabadell'?'Santander':'Sabadell';
  let plan=null;
  if(body.planId&&previous&&body.planId!==previous.id)fail('El traspaso ya está vinculado a otra previsión.');
  if(body.planId&&!previous){
    plan=(await db.query('SELECT * FROM tesoreria_traspasos_propios WHERE id=$1 FOR UPDATE',[body.planId])).rows[0];
    if(!plan||plan.estado!=='previsto'||plan.banco_origen!==source||plan.banco_destino!==destination||cents(plan.importe)!==Math.abs(cents(line.importe))||previous)fail('La previsión no corresponde a este traspaso o ya está asociada.');
  }
  const id=previous?.id||plan?.id||`transfer_${randomUUID()}`;
  const result=(await db.query(`INSERT INTO tesoreria_traspasos_propios(id,banco_origen,banco_destino,importe,fecha,estado,id_linea_cargo,id_linea_abono,motivo,actor)
    VALUES($1,$2,$3,$4,$5,'revisado',$6,$7,$8,$9)
    ON CONFLICT(id) DO UPDATE SET estado='revisado',fecha=EXCLUDED.fecha,id_linea_cargo=EXCLUDED.id_linea_cargo,id_linea_abono=EXCLUDED.id_linea_abono,motivo=EXCLUDED.motivo,actor=EXCLUDED.actor,updated_at=now() RETURNING *`,
    [id,source,destination,Math.abs(Number(line.importe)),day(line),cargo,abono,body.reason.trim(),actor])).rows[0];
  await db.query(`UPDATE tesoreria_movimientos_bancarios SET estado_revision=true,
    tipo_ingreso=CASE WHEN importe>0 THEN 'otro' ELSE tipo_ingreso END,
    comentarios=CASE WHEN strpos(COALESCE(comentarios,''),$2)>0 THEN comentarios ELSE concat_ws(E'\n',NULLIF(comentarios,''),$2) END,
    updated_at=CASE WHEN NOT estado_revision OR strpos(COALESCE(comentarios,''),$2)=0 THEN now() ELSE updated_at END WHERE id_linea_banco=ANY($1::text[])`,[ids,`Traspaso propio ${id}: ${body.reason.trim()}`]);
  return result;
}
export async function saveInternalTransfer(body,actor='',pool=getPgPool()) {
  const db=await pool.connect();
  try {
    await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");await lockIncome(db);
    let result;
    if(body.action==='plan') {
      if(!['Sabadell','Santander'].includes(body.source)||!['Sabadell','Santander'].includes(body.destination)||body.source===body.destination||!dateISO(body.date)||!Number.isFinite(Number(body.amount))||cents(body.amount)<=0||Math.abs(Number(body.amount)*100-cents(body.amount))>0.00001||Number(body.amount)>9999999999.99||typeof body.reason!=='string'||!body.reason.trim()||body.reason.length>3000)fail('Completa bancos distintos, fecha, importe con hasta dos decimales y motivo.');
      result=(await db.query(`INSERT INTO tesoreria_traspasos_propios(id,banco_origen,banco_destino,importe,fecha,estado,prevision,motivo,actor) VALUES($1,$2,$3,$4,$5,'previsto',true,$6,$7) RETURNING *`,[`transfer_${randomUUID()}`,body.source,body.destination,body.amount,dateISO(body.date),body.reason.trim(),actor])).rows[0];
    }else if(body.action==='cancel-plan') {
      result=(await db.query("UPDATE tesoreria_traspasos_propios SET estado='cancelado',updated_at=now() WHERE id=$1 AND estado='previsto' AND date_trunc('milliseconds',updated_at)=$2::timestamptz RETURNING *",[body.planId,body.version])).rows[0];
      if(!result)fail('La previsión cambió o ya está asociada.');
    }else if(body.action==='review')result=await reviewInternalTransfer(db,body,actor);
    else fail('Acción de traspaso no válida.');
    await db.query('COMMIT');return result;
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
export async function reopenInternalTransfers(db,ids) {
  const transfers=await readInternalTransfers(db);
  const linked=transfers.filter(t=>[t.id_linea_cargo,t.id_linea_abono].some(id=>ids.includes(id)));
  const all=[...new Set(linked.flatMap(t=>[t.id_linea_cargo,t.id_linea_abono]).filter(Boolean))].sort();
  if(!all.length)return;
  await db.query('SELECT id_linea_banco FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=ANY($1::text[]) ORDER BY id_linea_banco FOR UPDATE',[all]);
  await db.query("UPDATE tesoreria_traspasos_propios SET estado='pendiente_revision',updated_at=now() WHERE id=ANY($1::text[])",[linked.map(t=>t.id)]);
  await db.query('UPDATE tesoreria_movimientos_bancarios SET estado_revision=false,updated_at=now() WHERE id_linea_banco=ANY($1::text[])',[all]);
}
