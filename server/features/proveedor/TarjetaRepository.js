import Joi from 'joi';
import { randomUUID } from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
import { ProveedorError, validateData, supplierTransaction } from './SupplierAdminRepository.js';
import { isoDate, validDate } from './CardSettlement.js';

export async function getTarjetas() { return (await getPgPool().query("SELECT *,to_char(inicio_periodo,'YYYY-MM-DD') inicio_periodo,to_char(proximo_cierre,'YYYY-MM-DD') proximo_cierre,to_char(proxima_liquidacion,'YYYY-MM-DD') proxima_liquidacion FROM tesoreria_tarjetas ORDER BY tipo,estado,lower(nombre),ultimos_digitos")).rows; }
export async function saveTarjeta(id, body) {
  const data = validateData(Joi.object({ ultimos_digitos:Joi.string().pattern(/^\d{4}$/).required(),nombre:Joi.string().trim().max(200).required(),banco:Joi.string().trim().max(100).required(),tipo:Joi.string().valid('p3','personal').required(),estado:Joi.string().valid('activa','obsoleta').required(),codigo:Joi.string().trim().max(200),descripcion:Joi.string().max(10000).allow(''),periodicidad_meses:Joi.number().integer().min(1).max(12),inicio_periodo:Joi.string().allow('',null),proximo_cierre:Joi.string().allow('',null),proxima_liquidacion:Joi.string().allow('',null),expectedVersion:Joi.string() }),body);
  return supplierTransaction(async db=>{
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    const old=id?(await db.query("SELECT *,to_char(inicio_periodo,'YYYY-MM-DD') inicio_periodo,to_char(proximo_cierre,'YYYY-MM-DD') proximo_cierre,to_char(proxima_liquidacion,'YYYY-MM-DD') proxima_liquidacion FROM tesoreria_tarjetas WHERE id_tarjeta=$1 FOR UPDATE",[id])).rows[0]:null;
    if(id&&!old)throw new ProveedorError('Tarjeta no encontrada.',404);
    if(old&&data.expectedVersion&&new Date(old.updated_at).getTime()!==new Date(data.expectedVersion).getTime())throw new ProveedorError('La tarjeta ha cambiado. Recarga su ficha.',409);
    const merged={...old,...data}, dates=['inicio_periodo','proximo_cierre','proxima_liquidacion'].map(k=>isoDate(merged[k]));
    if(id&&data.estado==='obsoleta'&&(await db.query(`SELECT 1 FROM tesoreria_cargos_recurrentes WHERE id_tarjeta=$1 AND activo
      UNION ALL SELECT 1 FROM administracion_tickets WHERE id_tarjeta=$1 AND p3_income_date(fecha_ticket)>=COALESCE($2::date,'1900-01-01') LIMIT 1`,[id,dates[0]||null])).rowCount)throw new ProveedorError('Liquida los tickets pendientes y finaliza o desvincula las suscripciones antes de dar de baja la tarjeta.');
    if(dates.some(Boolean)&&(!dates.every(validDate)||dates[0]>dates[1]||dates[1]>dates[2]))throw new ProveedorError('Completa inicio, cierre y liquidación en ese orden.');
    if(dates.some(Boolean)&&!['Sabadell','Santander'].includes(merged.banco))throw new ProveedorError('Selecciona Sabadell o Santander para liquidar la tarjeta.');
    const history=id&&(await db.query("SELECT 1 FROM tesoreria_tarjetas_liquidaciones WHERE id_tarjeta=$1 AND estado='revisada' LIMIT 1",[id])).rowCount;
    if(history&&(['inicio_periodo','proximo_cierre','proxima_liquidacion'].some((k,i)=>isoDate(old[k])!==dates[i])||merged.banco!==old.banco||merged.periodicidad_meses!==old.periodicidad_meses))throw new ProveedorError('El calendario y el banco de una tarjeta liquidada se conservan. Crea otra tarjeta para cambiar el ciclo.');
    const cardId=id||randomUUID();
    const values=[data.ultimos_digitos,data.nombre,data.banco,data.tipo,data.estado,cardId,merged.codigo||cardId,merged.descripcion||'',merged.periodicidad_meses||1,...dates.map(d=>d||null),history?old.dia_cierre:Number(dates[1].slice(8))||null,history?old.dia_liquidacion:Number(dates[2].slice(8))||null];
    return (await db.query(id?'UPDATE tesoreria_tarjetas SET ultimos_digitos=$1,nombre=$2,banco=$3,tipo=$4,estado=$5,codigo=$7,descripcion=$8,periodicidad_meses=$9,inicio_periodo=$10,proximo_cierre=$11,proxima_liquidacion=$12,dia_cierre=$13,dia_liquidacion=$14,updated_at=now() WHERE id_tarjeta=$6 RETURNING *':'INSERT INTO tesoreria_tarjetas(ultimos_digitos,nombre,banco,tipo,estado,id_tarjeta,codigo,descripcion,periodicidad_meses,inicio_periodo,proximo_cierre,proxima_liquidacion,dia_cierre,dia_liquidacion) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *',values)).rows[0];
  });
}
export async function deleteTarjeta(id) {
  return supplierTransaction(async db=>{
    await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
    if((await db.query('SELECT 1 FROM administracion_tickets WHERE id_tarjeta=$1 LIMIT 1',[id])).rowCount)throw new ProveedorError('La tarjeta tiene tickets asociados. Conserva su histórico.',409);
    const result = await db.query('DELETE FROM tesoreria_tarjetas WHERE id_tarjeta=$1 RETURNING id_tarjeta',[id]);
    if (!result.rowCount) throw new ProveedorError('Tarjeta no encontrada.',404);
    return { ok:true };
  });
}
