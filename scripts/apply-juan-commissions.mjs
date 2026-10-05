import env from '@next/env';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {getPgPool} from '../server/database/pgClient.js';
import {insertRecurringCharge} from '../server/features/prevision/RecurringChargeRepository.js';
import {generateOccurrences} from '../server/features/banco/BankReviewAnalysis.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
try {
 await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
 const book=(await db.query("SELECT * FROM tesoreria_prevision_juan WHERE id='juan-2026' FOR UPDATE")).rows[0];
 const old=(await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente IN(13,14,19) FOR UPDATE')).rows;
 const dues=(await db.query("SELECT *,to_char(fecha,'YYYY-MM-DD') fecha FROM tesoreria_cargos_vencimientos WHERE id_cargo_recurrente IN(14,19) AND fecha>='2026-10-01'")).rows;
 fs.writeFileSync(path.join(os.tmpdir(),'p3-juan-commissions-before.json'),JSON.stringify({book,old,dues},null,2));
 for(const id of [14,19]) {
  if((await db.query("SELECT 1 FROM tesoreria_cargos_vencimientos v WHERE id_cargo_recurrente=$1 AND fecha>='2026-10-01' AND (EXISTS(SELECT 1 FROM tesoreria_vencimientos_aplicaciones a WHERE a.id_vencimiento=v.id) OR EXISTS(SELECT 1 FROM administracion_tickets t WHERE t.id_vencimiento_tarjeta=v.id))",[id])).rowCount)throw Error('Hay comisiones futuras aplicadas: revisar antes de sustituir.');
  // Retain the charge, its history and bank links; retire its unsupported forecasts.
  await db.query('UPDATE tesoreria_cargos_recurrentes SET activo=FALSE,updated_at=now() WHERE id_cargo_recurrente=$1',[id]);
 }
 const sabProvider=old.find(c=>String(c.id_cargo_recurrente)==='13')?.id_proveedor;
 if(!sabProvider)throw Error('Falta proveedor Sabadell.');
 let santProviders=(await db.query("SELECT * FROM administracion_proveedores WHERE upper(trim(nombre_proveedor)) IN('BANCO SANTANDER','SANTANDER') OR upper(trim(nombre_fiscal_proveedor)) IN('BANCO SANTANDER','BANCO SANTANDER S.A.','BANCO SANTANDER, S.A.')")).rows;
 if(santProviders.length>1)throw Error('Varias fichas de Santander.');
 if(!santProviders.length)santProviders=(await db.query("INSERT INTO administracion_proveedores(id_proveedor,nombre_proveedor,nombre_fiscal_proveedor,pais_proveedor,moneda_proveedor) VALUES($1,'Banco Santander','Banco Santander, S.A.','España','EUR') RETURNING *",['prov_'+randomUUID().replaceAll('-','')])).rows;
 const result=[];
 for(const [bank,rowId,provider,day,amounts] of [['Sabadell','payments:19',sabProvider,2,[3,2,1]],['Santander','payments:42',santProviders[0].id_proveedor,26,[15,15,15]]]) {
  const sheet=book.sheets.find(s=>s.bank===bank),row=sheet.payments.find(r=>r.id===rowId);
  const prior=(await db.query("SELECT * FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id='juan-2026' AND bank=$1 AND row_id=$2",[bank,rowId])).rows[0];
  let charge;
  if(prior?.evidence?.commissionApproval==='2026-10-03')charge=(await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1 AND activo',[prior.charge_ids[0]])).rows[0];
  else {
   const existing=(await db.query("SELECT id_cargo_recurrente FROM tesoreria_cargos_recurrentes c WHERE activo AND id_proveedor=$1 AND EXISTS(SELECT 1 FROM tesoreria_cargos_vencimientos v WHERE v.id_cargo_recurrente=c.id_cargo_recurrente AND fecha BETWEEN '2026-10-01' AND '2026-12-31')",[provider])).rows;
   if(existing.length)throw Error(`Ya hay cargos del banco ${bank} en estos meses: comprobar antes de duplicar.`);
   charge=await insertRecurringCharge(db,{tipo_cargo:'proveedor',id_proveedor:provider,banco_pago:bank,tipo_programacion:'fechas',termina_planificacion:true,programacion:amounts.map((amount,index)=>({dia:day,mes:index+10,anio:2026,total_iva:amount,base_imponible:0,descripcion:bank==='Sabadell'?'COMISIONES REMESAS Y TRANSFERENCIAS · presupuesto global Juan; desglose de comisión e impuesto pendiente':'COMISION CUENTA · Santander · liquidación mensual · día 26 estimado'}))});
  }
  if(!charge)throw Error('Falta el cargo previamente integrado.');
  // October 2 is already past today, but remains an unfulfilled monthly budget.
  // Keep its pending occurrence rather than silently omitting that month's charge.
  for(const due of generateOccurrences([charge],'2026-10-01','2026-12-31').occurrences)await db.query('INSERT INTO tesoreria_cargos_vencimientos(id,id_cargo_recurrente,id_regla,fecha,importe,descripcion,programacion) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT DO NOTHING',[due.id,due.id_cargo_recurrente,due.id_regla,due.fecha,due.importe,due.descripcion,JSON.stringify(due.programacion)]);
  row.day=day;for(const [i,c] of sheet.columns.entries())if(c.kind==='forecast')row.values[i]=Math.round(amounts[c.month-10]*100);
  const reason=bank==='Sabadell'?'Presupuesto global 3/2/1 € confirmado para octubre–diciembre, sustituyendo las previsiones de 20 y 1.300 €. Servicio de información separado. Desglose entre remesas, transferencias e impuestos pendiente.':'15 €/mes confirmado, día 26 estimado, conforme a las liquidaciones mensuales observadas; proveedor Banco Santander.';
  await db.query("UPDATE tesoreria_prevision_juan_asociaciones SET status='integrated',provider_id=$3,employee_id=NULL,charge_ids=$4::jsonb,evidence=$5::jsonb,updated_at=now() WHERE workbook_id='juan-2026' AND bank=$1 AND row_id=$2",[bank,rowId,provider,JSON.stringify([String(charge.id_cargo_recurrente)]),JSON.stringify({reason,candidates:[],conflicts:[],commissionApproval:'2026-10-03',retiredCharges:bank==='Sabadell'?[14,19]:[]})]);
  for(const month of [10,11,12])await db.query("INSERT INTO tesoreria_prevision_juan_enlaces(workbook_id,cell_key,section,target_id,status,note) VALUES('juan-2026',$1,'payments',$2,'integrated',$3) ON CONFLICT(workbook_id,cell_key) DO UPDATE SET target_id=EXCLUDED.target_id,status=EXCLUDED.status,note=EXCLUDED.note",[`${bank}:${rowId}:${month}`,String(charge.id_cargo_recurrente),reason]);
  result.push({bank,charge:charge.id_cargo_recurrente,amounts,day});
 }
 await db.query("UPDATE tesoreria_cargos_recurrentes SET banco_pago='Sabadell',updated_at=now() WHERE id_cargo_recurrente=13");
 await db.query("UPDATE tesoreria_prevision_juan SET sheets=$1::jsonb,version=version+1,updated_at=now() WHERE id='juan-2026'",[JSON.stringify(book.sheets)]);
 await db.query('COMMIT');console.log(JSON.stringify({applied:result,retired:[14,19],informationServiceRetained:13}));
}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await pool.end();}
