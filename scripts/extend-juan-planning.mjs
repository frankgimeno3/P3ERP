import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {randomUUID} from 'node:crypto';
env.loadEnvConfig(process.cwd());const p=getPgPool(),db=await p.connect();
try {
 await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
 const b=(await db.query("SELECT * FROM tesoreria_prevision_juan WHERE id='juan-2026' FOR UPDATE")).rows[0];
 async function association(bank,row,chargeId,status,reason,provider=null) {
  const charge=chargeId?(await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=$1',[chargeId])).rows[0]:null;
  await db.query("INSERT INTO tesoreria_prevision_juan_asociaciones(workbook_id,bank,row_id,status,provider_id,employee_id,charge_ids,evidence) VALUES('juan-2026',$1,$2,$3,$4,$5,$6::jsonb,$7::jsonb) ON CONFLICT(workbook_id,bank,row_id) DO UPDATE SET status=EXCLUDED.status,provider_id=EXCLUDED.provider_id,employee_id=EXCLUDED.employee_id,charge_ids=EXCLUDED.charge_ids,evidence=EXCLUDED.evidence",[bank,row.id,status,charge?.id_proveedor||provider,charge?.id_agente||null,JSON.stringify(charge?[String(chargeId)]:[]),JSON.stringify({reason,candidates:[],conflicts:[]})]);
  if(charge)for(const [i,c] of b.sheets.find(s=>s.bank===bank).columns.entries())if(c.kind==='forecast'&&row.values[i]>0)await db.query("INSERT INTO tesoreria_prevision_juan_enlaces(workbook_id,cell_key,section,target_id,status,note) VALUES('juan-2026',$1,'payments',$2,'matched',$3) ON CONFLICT(workbook_id,cell_key) DO UPDATE SET target_id=EXCLUDED.target_id,status=EXCLUDED.status,note=EXCLUDED.note",[`${bank}:${row.id}:${c.month}`,String(chargeId),reason]);
 }
 const sab=b.sheets.find(s=>s.bank==='Sabadell'),pixup=sab.payments.find(r=>r.id==='payments:46');
 for(const [suffix,label,id,month,amount,day] of [['hosting','PIXUP · HOSTING / SERVIDOR',27,11,25226,24],['soporte','PIXUP · SOPORTE Y MANTENIMIENTO',26,12,41423,29]]) {
  let row=sab.payments.find(r=>r.id===`${pixup.id}:${suffix}`);
  if(!row){row={...structuredClone(pixup),id:`${pixup.id}:${suffix}`,label,day,values:sab.columns.map(c=>c.kind==='forecast'&&c.month===month?amount:null)};sab.payments.splice(sab.payments.indexOf(pixup)+1,0,row);}
  await association('Sabadell',row,id,'matched','PIXUP confirmado: vencimiento vigente del ERP añadido a Juan, sin crear otro cargo.');
 }
 const service=(await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=13 FOR UPDATE')).rows[0];
 const rule={...service.programacion[0],total_iva:48.40,base_imponible:0,inicio_dia:'2',inicio_mes:'1',inicio_anio:'2026',descripcion:'Servicio información Sabadell Negocios · 48,40 € según extracto · próxima fecha 02/01 estimada; base fiscal pendiente de factura'};
 if((await db.query("SELECT 1 FROM tesoreria_cargos_vencimientos v WHERE id_cargo_recurrente=13 AND fecha>='2026-10-01' AND EXISTS(SELECT 1 FROM tesoreria_vencimientos_aplicaciones a WHERE a.id_vencimiento=v.id)")).rowCount)throw Error('Servicio de información con vencimientos aplicados.');
 await db.query('UPDATE tesoreria_cargos_recurrentes SET programacion=$1::jsonb,updated_at=now() WHERE id_cargo_recurrente=13',[JSON.stringify([rule])]);
 await db.query("UPDATE tesoreria_cargos_vencimientos SET fecha=make_date(extract(year FROM fecha)::int,1,2),importe=48.40,descripcion=$1,programacion=$2::jsonb WHERE id_cargo_recurrente=13 AND fecha>='2026-10-01'",[rule.descripcion,JSON.stringify({tipo:'periodicidad',regla:rule})]);
 const serviceRow=sab.payments.find(r=>r.id==='payments:21');serviceRow.label='SERVICIO INFORMACIÓN SABADELL NEGOCIOS';
 await association('Sabadell',serviceRow,13,'historical','Servicio separado: 48,40 € según extracto. Próxima fecha anual 02/01 estimada a partir del último cargo.');
 // Victor's steady salary continues beyond December; September's partial amount stays historical.
 const victor=(await db.query("SELECT * FROM tesoreria_cargos_recurrentes WHERE activo AND id_agente=(SELECT id_agente FROM agentes_db WHERE email_agente='internationalsales@vidrioperfil.com') FOR UPDATE")).rows[0];
 const salary={id_regla:victor.programacion[0].id_regla||randomUUID(),cada:1,unidad:'meses',inicio_dia:'31',inicio_mes:'10',inicio_anio:'2026',total_iva:1200,base_imponible:0,descripcion:'Nómina Víctor Joven Castillo'};
 await db.query("UPDATE tesoreria_cargos_recurrentes SET tipo_programacion='periodicidad',programacion=$1::jsonb,termina_planificacion=FALSE,updated_at=now() WHERE id_cargo_recurrente=$2",[JSON.stringify([salary]),victor.id_cargo_recurrente]);
 for(const s of b.sheets)for(const parent of s.payments.filter(r=>/^VISA/.test(r.label)&&!r.cardPart)) {
  if(s.payments.some(r=>r.id===`${parent.id}:variable`))continue;
  const index=s.payments.indexOf(parent);
  const fixed={...structuredClone(parent),id:`${parent.id}:subscriptions`,label:`${parent.label} · SUSCRIPCIONES`,cardPart:'subscriptions',values:s.columns.map(c=>c.kind==='forecast'?0:null)};
  const variable={...structuredClone(parent),id:`${parent.id}:variable`,label:`${parent.label} · GASTO VARIABLE`,cardPart:'variable',values:parent.values.map((v,i)=>s.columns[i].kind==='forecast'?v:null)};
  for(const [i,c] of s.columns.entries())if(c.kind==='forecast')parent.values[i]=null;
  s.payments.splice(index+1,0,fixed,variable);
  await association(s.bank,parent,null,'historical','Histórico agrupado. Las previsiones futuras se separan en suscripciones y gasto variable.');
  await association(s.bank,fixed,null,'group','Suscripciones mensuales y anuales de tarjetas del ERP. Falta configurar y asociar las tarjetas y sus servicios; sin datos no se inventan suscripciones.');
  await association(s.bank,variable,null,'group','Presupuesto variable editable y revisable por mes. Inicialmente conserva el presupuesto de Juan; al identificar una suscripción, reduce este variable si ya estaba incluida para evitar sumarla dos veces.');
 }
 await db.query("UPDATE tesoreria_prevision_juan SET sheets=$1::jsonb,version=version+1,updated_at=now() WHERE id='juan-2026'",[JSON.stringify(b.sheets)]);
 await db.query('COMMIT');console.log('APPLIED: PIXUP linked, information service 48.40 and January estimate, Victor recurring salary, card subscriptions/variable sections.');
}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await p.end();}
