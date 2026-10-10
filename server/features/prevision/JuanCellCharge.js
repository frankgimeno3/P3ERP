import {generateOccurrences,ruleId} from '../banco/BankReviewAnalysis.js';
import {RecurringChargeError} from './RecurringChargeRepository.js';
import {forecastVat} from '../../../app/lib/forecastVat.js';

export async function editJuanChargeMonth(db,chargeId,year,month,value,bank,rowDay=null,dueId=null) {
 const charge=(await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1 FOR UPDATE',[chargeId])).rows[0];
 if(!charge||charge.banco_pago!==bank||!charge.activo)throw new RecurringChargeError('El cargo ha cambiado de banco o está inactivo. Recarga la página.',409);
 if(charge.tipo_cargo==='nomina'&&(await db.query('SELECT 1 FROM laboral_nominas WHERE id_empleado=$1 AND anio=$2 AND mes=$3 LIMIT 1',[charge.id_agente,year,month])).rowCount)throw new RecurringChargeError('Este mes ya tiene una nómina registrada. Corrige esa nómina antes de cambiar su previsión; no se crea un importe paralelo.',409);
 const from=`${year}-${String(month).padStart(2,'0')}-01`,until=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
 const generated=generateOccurrences([{...charge,tipo_cargo:'otro'}],from,until).occurrences;
 const stored=(await db.query("SELECT *,to_char(fecha,'YYYY-MM-DD') AS fecha FROM tesoreria_cargos_vencimientos WHERE id_cargo_recurrente=$1 AND fecha BETWEEN $2::date AND $3::date FOR UPDATE",[chargeId,from,until])).rows;
 let dues=charge.tipo_cargo==='nomina'?generated:stored.length?stored:generated;
 // A cancelled exception can be restored by typing in its cell again.
 if(!dues.length)for(const [index,rule] of charge.programacion.entries())for(const date of Object.keys(rule.importes_por_fecha||{}))if(date>=from&&date<=until)dues.push({fecha:date,id_regla:ruleId(charge,rule,index)});
 if(!dues.length&&(value??0)>0&&charge.programacion.length===1) {
  const rule=charge.programacion[0],day=Math.min(Number(rowDay||rule.inicio_dia||rule.dia||31),new Date(Date.UTC(year,month,0)).getUTCDate());
  dues.push({fecha:`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`,id_regla:ruleId(charge,rule,0)});
 }
 if(!dues.length&&(value??0)===0)return;
 if(dueId)dues=dues.filter(d=>d.id===dueId);
 if(dues.length!==1)throw new RecurringChargeError(dues.length?'Esta celda agrupa varios vencimientos. Modifica cada cargo en su desglose.':'Este cargo no tiene vencimiento en ese mes. Añade una previsión con el botón +.',409);
 const selectedStored=stored.find(d=>d.id===dues[0].id);
 const due=dues[0],amount=(value??0)/100;
 if(selectedStored) {
  const used=(await db.query(`SELECT COALESCE(sum(importe),0) AS amount FROM tesoreria_vencimientos_aplicaciones WHERE id_vencimiento=$1`,[selectedStored.id])).rows[0];
  const ticket=(await db.query('SELECT 1 FROM administracion_tickets WHERE id_vencimiento_tarjeta=$1 LIMIT 1',[selectedStored.id])).rowCount;
  if(Number(used.amount)>amount||ticket)throw new RecurringChargeError('El vencimiento tiene pagos o tickets asociados. Revisa esos documentos antes de reducirlo o retirarlo.',409);
  if(amount===0)await db.query('DELETE FROM tesoreria_cargos_vencimientos WHERE id=$1',[selectedStored.id]);
  else await db.query('UPDATE tesoreria_cargos_vencimientos SET importe=$2 WHERE id=$1',[selectedStored.id,amount]);
 }
 const index=charge.programacion.findIndex((r,i)=>ruleId(charge,r,i)===due.id_regla);
 if(index<0)throw new RecurringChargeError('No se puede identificar la regla del vencimiento. Revisa el cargo desde su desglose.',409);
 const rule=charge.programacion[index];
 rule.importes_por_fecha={...rule.importes_por_fecha,[due.fecha]:amount};
 if(charge.tipo_cargo!=='nomina'&&typeof rule.contains_iva==='boolean') {
  const base=amount===0?0:forecastVat(amount,rule.contains_iva,rule.tipo_iva).base_imponible;
  rule.bases_por_fecha={...rule.bases_por_fecha,[due.fecha]:base};
  if(selectedStored&&amount>0)await db.query('UPDATE tesoreria_cargos_vencimientos SET programacion=$2::jsonb WHERE id=$1',[selectedStored.id,JSON.stringify({tipo:charge.tipo_programacion,regla:{...rule,total_iva:amount,base_imponible:base}})]);
 }
 await db.query('UPDATE tesoreria_cargos_recurrentes SET programacion=$2::jsonb,updated_at=now() WHERE id_cargo_recurrente=$1',[chargeId,JSON.stringify(charge.programacion)]);
 // Restore a previously removed supplier due using the existing canonical identifier.
 if(!selectedStored&&charge.tipo_cargo!=='nomina'&&amount>0) {
  const occurrence=generateOccurrences([{...charge,tipo_cargo:'otro'}],from,until).occurrences.find(d=>d.fecha===due.fecha);
  if(occurrence)await db.query(`INSERT INTO tesoreria_cargos_vencimientos(id,id_cargo_recurrente,id_regla,fecha,importe,descripcion,programacion) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT(id) DO UPDATE SET importe=EXCLUDED.importe`,[occurrence.id,chargeId,occurrence.id_regla,occurrence.fecha,amount,occurrence.descripcion,JSON.stringify(occurrence.programacion)]);
 }
}
