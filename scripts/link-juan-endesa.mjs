import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {insertRecurringCharge} from '../server/features/prevision/RecurringChargeRepository.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool(),db=await pool.connect();
try {
 await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
 const book=(await db.query("SELECT * FROM tesoreria_prevision_juan WHERE id='juan-2026' FOR UPDATE")).rows[0],sheet=book.sheets.find(s=>s.bank==='Santander');
 const linked=[];
 for(const [rowId,contract] of [['payments:24','82010083751'],['payments:25','82010077716']]) {
  const association=(await db.query("SELECT * FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id='juan-2026' AND bank='Santander' AND row_id=$1 FOR UPDATE",[rowId])).rows[0];
  if(association.charge_ids.length){linked.push({rowId,alreadyLinked:true});continue;}
  const row=sheet.payments.find(r=>r.id===rowId);
  const rules=sheet.columns.flatMap((column,index)=>column.kind==='forecast'&&row.values[index]>0?[{dia:row.day,mes:column.month,anio:2026,total_iva:row.values[index]/100,contains_iva:true,tipo_iva:21,descripcion:`ENDESA · ${row.label} · contrato ${contract}`,contrato_suministro:contract,contrato_matching:'Por importes del histórico: revisión pendiente de factura.',fiscal_evidence:'Endesa: IVA 21% desde junio 2026; previsión octubre-diciembre, revisar frente a factura.'}]:[]);
  const charge=await insertRecurringCharge(db,{tipo_cargo:'proveedor',id_proveedor:association.provider_id,banco_pago:'Santander',tipo_programacion:'fechas',termina_planificacion:true,programacion:rules});
  await db.query("UPDATE tesoreria_prevision_juan_asociaciones SET charge_ids=$2::jsonb,status='matched',evidence=jsonb_set(evidence,'{reason}',to_jsonb($3::text)),updated_at=now() WHERE workbook_id='juan-2026' AND bank='Santander' AND row_id=$1",[rowId,JSON.stringify([String(charge.id_cargo_recurrente)]),'Proveedor Endesa confirmado. Mismos importes y fechas de Juan, compartidos con el ERP. Contrato identificado por el histórico; noviembre y periodicidad pendientes de revisión.']);
  for(const column of sheet.columns.filter(c=>c.kind==='forecast'))await db.query("INSERT INTO tesoreria_prevision_juan_enlaces(workbook_id,cell_key,section,target_id,status,note) VALUES('juan-2026',$1,'payments',$2,'matched','Endesa: proveedor confirmado; calendario de Juan conservado') ON CONFLICT(workbook_id,cell_key) DO UPDATE SET target_id=EXCLUDED.target_id,status=EXCLUDED.status,note=EXCLUDED.note",[`Santander:${rowId}:${column.month}`,String(charge.id_cargo_recurrente)]);
  linked.push({rowId,charge:charge.id_cargo_recurrente,total:rules.reduce((n,r)=>n+r.total_iva,0)});
 }
 await db.query("UPDATE tesoreria_prevision_juan_asociaciones a SET provider_id=s.provider_id,updated_at=now() FROM tesoreria_prevision_juan_asociaciones s WHERE s.workbook_id='juan-2026' AND a.workbook_id<>'juan-2026' AND a.bank=s.bank AND a.row_id=s.row_id AND s.row_id IN ('payments:24','payments:25') AND s.provider_id IS NOT NULL");
 await db.query("UPDATE tesoreria_prevision_juan SET version=version+1,updated_at=now() WHERE id IN ('juan-2026','juan-2027')");
 await db.query('COMMIT');console.log(JSON.stringify(linked));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
