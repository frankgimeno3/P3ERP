// Applies only the identities/amounts explicitly resolved in the user's second round.
// Run without --write to validate the complete transaction and roll it back.
import env from '@next/env';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {getPgPool} from '../server/database/pgClient.js';
import {insertRecurringCharge} from '../server/features/prevision/RecurringChargeRepository.js';
import {plannedJuanCells,juanTotals} from '../server/features/prevision/JuanExcel.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),changes=[];
const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]/g,'');
try {
 await db.query('BEGIN');
 await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
 const book=(await db.query("SELECT * FROM tesoreria_prevision_juan WHERE id='juan-2026' FOR UPDATE")).rows[0];
 if(!book)throw Error('Falta importar el libro.');
 const before=structuredClone(book);
 const sheets=book.sheets;
 const sheetFor=bank=>sheets.find(s=>s.bank===bank);
 const rowFor=(bank,label)=>sheetFor(bank).payments.find(r=>r.label===label);
 const charges=(await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE activo FOR UPDATE')).rows;
 const beforeCharges=structuredClone(charges);
 const beforeDues=(await db.query("SELECT *,to_char(fecha,'YYYY-MM-DD') fecha FROM tesoreria_cargos_vencimientos WHERE fecha>='2026-10-01'")).rows;
 async function associate(bank,row,charge,reason,status='matched') {
  if(charge.tipo_cargo==='nomina'&&(!charge.id_agente||charge.id_proveedor))throw Error('La nómina debe tener empleado y no proveedor.');
  await db.query(`INSERT INTO tesoreria_prevision_juan_asociaciones(workbook_id,bank,row_id,status,provider_id,employee_id,charge_ids,evidence)
   VALUES('juan-2026',$1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)
   ON CONFLICT(workbook_id,bank,row_id) DO UPDATE SET status=EXCLUDED.status,provider_id=EXCLUDED.provider_id,employee_id=EXCLUDED.employee_id,charge_ids=EXCLUDED.charge_ids,evidence=EXCLUDED.evidence,updated_at=now()`,
   [bank,row.id,status,charge.id_proveedor,charge.id_agente,JSON.stringify([String(charge.id_cargo_recurrente)]),JSON.stringify({reason,conflicts:[],candidates:[],label:row.label,approvedRound:'2026-10-03',future:sheetFor(bank).columns.flatMap((c,i)=>c.kind==='forecast'&&row.values[i]>0?[{month:c.month,amount:row.values[i],day:Math.min(row.day||31,new Date(Date.UTC(2026,c.month,0)).getUTCDate())}]:[])})]);
  if(status==='matched'||status==='integrated')for(const cell of plannedJuanCells(sheets).filter(c=>c.bank===bank&&c.rowId===row.id))await db.query(`INSERT INTO tesoreria_prevision_juan_enlaces(workbook_id,cell_key,section,target_id,status,note)
    VALUES('juan-2026',$1,'payments',$2,$3,$4) ON CONFLICT(workbook_id,cell_key) DO UPDATE SET target_id=EXCLUDED.target_id,status=EXCLUDED.status,note=EXCLUDED.note`,[cell.key,String(charge.id_cargo_recurrente),status,reason]);
 }
 async function align(bank,label,id,amount=null,day=null) {
  const row=rowFor(bank,label),charge=charges.find(c=>String(c.id_cargo_recurrente)===String(id));
  if(!row||!charge||charge.programacion.length!==1)throw Error(`Revisar ${label}: no es un cargo simple.`);
  const original=structuredClone(charge);
  const rule={...charge.programacion[0],id_regla:charge.programacion[0].id_regla||`legacy:${id}:0`};
  if(amount!==null)rule.total_iva=amount;
  if(day!==null) {
   // Preserve the quarterly anchor month; payroll estimates start in October.
   rule.inicio_dia=String(day);rule.inicio_mes=rule.inicio_mes||'10';rule.inicio_anio=rule.inicio_anio||'2026';
  }
  charge.programacion=[rule];charge.banco_pago=bank;
  await db.query('UPDATE tesoreria_cargos_recurrentes SET programacion=$2::jsonb,banco_pago=$3,updated_at=now() WHERE id_cargo_recurrente=$1',[id,JSON.stringify(charge.programacion),bank]);
  // Preserve all past and applied occurrences, including their date and snapshot.
  if(day!==null||amount!==null) {
   const protectedDues=await db.query(`SELECT v.id FROM tesoreria_cargos_vencimientos v WHERE id_cargo_recurrente=$1 AND fecha>='2026-10-01' AND
    (EXISTS(SELECT 1 FROM tesoreria_vencimientos_aplicaciones a WHERE a.id_vencimiento=v.id) OR EXISTS(SELECT 1 FROM administracion_tickets t WHERE t.id_vencimiento_tarjeta=v.id))`,[id]);
   if(protectedDues.rowCount)throw Error(`Hay vencimientos aplicados de ${label}: revisar antes de cambiar.`);
   await db.query(`UPDATE tesoreria_cargos_vencimientos SET
    fecha=CASE WHEN $2::int IS NULL THEN fecha ELSE make_date(extract(year FROM fecha)::int,extract(month FROM fecha)::int,least($2::int,extract(day FROM (date_trunc('month',fecha)+interval '1 month - 1 day'))::int)) END,
    importe=COALESCE($3::numeric,importe),programacion=$4::jsonb WHERE id_cargo_recurrente=$1 AND fecha>='2026-10-01'`,[id,day,amount,JSON.stringify({tipo:charge.tipo_programacion,regla:rule})]);
  }
  if(amount!==null)for(const [i,column] of sheetFor(bank).columns.entries())if(column.kind==='forecast'&&row.values[i]>0)row.values[i]=Math.round(amount*100);
  if(day!==null)row.day=day;
  await associate(bank,row,charge,'Decisión confirmada: mismo cargo existente, banco e importe; histórico conservado.');
  changes.push({label,id,before:original,after:charge});
 }
 // These are employee payroll charges, never supplier purchases.
 for(const [label,id] of [['NOMINA CARLOS ORTEGA',2],['NOMINA RICARDO',3],['NOMINA MONTSE',12],['NOMINAS CHARLY',9],['NOMINAS PACO',10]]) {
  const bank=label.startsWith('NOMINAS')?'Santander':'Sabadell';
  await align(bank,label,id,null,rowFor(bank,label).day);
 }
 await align('Sabadell','NOMINA FRANK',11,5458,31);
 await align('Sabadell','NOMINA MELANI',8,1100.95,31);
 for(const [label,id,day] of [['ALQUILER 1º',5,7],['ALQUILER 2º',6,7],['SOFTLINE',7,27],['BITAVIS',15,27],['DAE LABORAL',4,31]])await align('Sabadell',label,id,null,day);
 // Day 3 was subsequently confirmed as the estimate by the user.
 await align('Sabadell','COMUNIDAD PARKING LLORET - COSVA',20,null,3);
 const sant=sheetFor('Santander'),securitas=sant.payments.find(r=>r.id==='payments:20');
 if(!securitas)throw Error('No se encuentra la fila fuente de Securitas.');
 if(!sant.payments.some(r=>r.id==='payments:20:lluria')) {
  if((await db.query("SELECT 1 FROM tesoreria_prevision_juan_aplicaciones WHERE workbook_id='juan-2026' AND cell_key LIKE 'Santander:payments:20:%'")).rowCount)throw Error('Securitas tiene aplicaciones: reasignar antes de separar.');
  const position=sant.payments.indexOf(securitas);
  const split=[['lluria','LLÚRIA',16,49.78],['breda','BREDA',17,58.95],['bruc','BRUC',18,57.60]].map(([suffix,name,id,amount])=>({row:{...structuredClone(securitas),id:`payments:20:${suffix}`,label:`SECURITAS ${name}`,values:sant.columns.map(c=>c.kind==='forecast'?Math.round(amount*100):null)},id,amount}));
  for(const [i,c] of sant.columns.entries())if(c.kind==='forecast')securitas.values[i]=null;
  securitas.label='SECURITAS · HISTÓRICO AGRUPADO';
  sant.payments.splice(position+1,0,...split.map(item=>item.row));
  await db.query("DELETE FROM tesoreria_prevision_juan_enlaces WHERE workbook_id='juan-2026' AND cell_key LIKE 'Santander:payments:20:%'");
 }
 // Keep Juan's estimated day 8; statements vary (4,6,7), not a confirmed exact day.
 for(const [label,id,amount] of [['SECURITAS LLÚRIA',16,49.78],['SECURITAS BREDA',17,58.95],['SECURITAS BRUC',18,57.60]])await align('Santander',label,id,amount,8);
 await db.query("UPDATE tesoreria_prevision_juan_asociaciones SET status='historical',charge_ids='[]'::jsonb,evidence=jsonb_build_object('reason','Histórico agrupado del Excel conservado; las previsiones se han separado por contrato.','conflicts','[]'::jsonb,'candidates','[]'::jsonb) WHERE workbook_id='juan-2026' AND bank='Santander' AND row_id='payments:20'");
 const email='internationalsales@vidrioperfil.com';
 let employee=(await db.query('SELECT * FROM agentes_db WHERE lower(btrim(email_agente))=$1 FOR UPDATE',[email])).rows[0];
 if(!employee) {
  employee=(await db.query("INSERT INTO agentes_db(id_agente,nombre_agente,apellidos_agente,nombre_completo_agente,email_agente,estado_agente,is_empleado_account) VALUES($1,'Víctor','Joven Castillo','Víctor Joven Castillo',$2,'activo',TRUE) RETURNING *",['ag_'+randomUUID().replaceAll('-','').slice(0,20),email])).rows[0];
  changes.push({createdEmployee:employee.id_agente,name:'Víctor Joven Castillo',status:'activo'});
 }
 if(!employee.is_empleado_account)throw Error('Ese correo ya existe sin ficha de empleado: revisar.');
 async function createForRow(bank,row,providerId,employeeId=null) {
  const prior=(await db.query("SELECT * FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id='juan-2026' AND bank=$1 AND row_id=$2",[bank,row.id])).rows[0];
  const priorCharge=prior?.charge_ids?.length===1?charges.find(c=>String(c.id_cargo_recurrente)===String(prior.charge_ids[0])):null;
  if(priorCharge&&['matched','integrated'].includes(prior.status)){await associate(bank,row,priorCharge,prior.evidence.reason,prior.status);return;}
  const targets=plannedJuanCells(sheets).filter(c=>c.bank===bank&&c.rowId===row.id);
  if(!targets.length) {
   await db.query("UPDATE tesoreria_prevision_juan_asociaciones SET provider_id=$3,employee_id=$4,status='historical',evidence=jsonb_build_object('reason','Organismo confirmado; sin previsión positiva de caja futura.','conflicts','[]'::jsonb,'candidates','[]'::jsonb),updated_at=now() WHERE workbook_id='juan-2026' AND bank=$1 AND row_id=$2",[bank,row.id,providerId,employeeId]);return;
  }
  if((await db.query("SELECT 1 FROM tesoreria_pagos_previstos WHERE id_proveedor=$1 AND p3_income_date(fecha_pago) BETWEEN '2026-10-01' AND '2026-12-31'",[providerId])).rowCount)throw Error(`Hay pagos existentes para ${row.label}: cruzar antes de crear.`);
  if(charges.some(c=>employeeId?c.id_agente===employeeId:c.id_proveedor===providerId&&c.programacion.some(r=>normalize(r.descripcion).includes(normalize(row.label)))))throw Error(`Hay un cargo potencial para ${row.label}.`);
  const charge=await insertRecurringCharge(db,{tipo_cargo:employeeId?'nomina':'proveedor',id_agente:employeeId,id_proveedor:providerId,banco_pago:bank,tipo_programacion:'fechas',termina_planificacion:true,programacion:targets.map(c=>{const [dia,mes,anio]=c.date.split('/').map(Number);return {dia,mes,anio,total_iva:c.amount/100,base_imponible:0,descripcion:`${row.label} · Juan 2026 · desglose fiscal pendiente`};})});
  charges.push(charge);await associate(bank,row,charge,'Entidad confirmada y cargo creado para los meses positivos del Excel; sin duplicar cargos existentes.','integrated');changes.push({createdCharge:charge.id_cargo_recurrente,label:row.label});
 }
 await createForRow('Sabadell',rowFor('Sabadell','NOMINA VICTOR JOVEN'),null,employee.id_agente);
 const suppliers=(await db.query('SELECT * FROM administracion_proveedores')).rows;
 async function entity(name,aliases) {
  const found=suppliers.filter(p=>[p.nombre_proveedor,p.nombre_fiscal_proveedor].some(n=>aliases.some(a=>normalize(n)===normalize(a))));
  if(found.length>1)throw Error(`Varias fichas para ${name}.`);
  if(found.length===1)return found[0].id_proveedor;
  const id='prov_'+randomUUID().replaceAll('-','');
  const added=(await db.query("INSERT INTO administracion_proveedores(id_proveedor,nombre_proveedor,nombre_fiscal_proveedor,pais_proveedor,moneda_proveedor) VALUES($1,$2,$2,'España','EUR') RETURNING *",[id,name])).rows[0];
  suppliers.push(added);changes.push({createdProvider:id,name,fiscalIdentificationPending:true});return id;
 }
 const aeat=await entity('Agencia Estatal de Administración Tributaria (AEAT)',['AEAT','Agencia Tributaria','Agencia Estatal de Administración Tributaria','Hacienda']);
 const tgss=await entity('Tesorería General de la Seguridad Social (TGSS)',['TGSS','Tesorería General de la Seguridad Social','Seguridad Social']);
 const bcn=await entity('Ajuntament de Barcelona',['Ajuntament de Barcelona','Ayuntamiento de Barcelona']);
 const lloret=await entity('Ajuntament de Lloret de Mar',['Ajuntament de Lloret de Mar','Ayuntamiento de Lloret de Mar']);
 const atc=await entity('Agència Tributària de Catalunya (ATC)',['ATC','Agència Tributària de Catalunya','Agencia Tributaria de Catalunya']);
 for(const s of sheets)for(const row of s.payments) {
  const provider=/^(IRPF|IVA|ISOC|IMPUESTO SOCIEDADES)/.test(row.label)?aeat:/^(SEGUROS SOCIALES|AUTONOMOS FRANK)$/.test(row.label)?tgss:row.label.startsWith('AJ.BCN')?bcn:row.label.startsWith('AJ.LLORET')?lloret:row.label.startsWith('IMPUESTO EMISIONES CO2')?atc:null;
  if(provider)await createForRow(s.bank,row,provider);
 }
 const amarant=suppliers.find(p=>p.id_proveedor==='prov_excel_serveis_grafics_amarant');
 if(!amarant)throw Error('Falta el proveedor SERVEIS GRAFICS AMARANT confirmado.');
 await createForRow('Sabadell',rowFor('Sabadell','AMARANT'),amarant.id_proveedor);
 await db.query("UPDATE tesoreria_prevision_juan SET sheets=$1::jsonb,version=version+1,updated_at=now() WHERE id='juan-2026'",[JSON.stringify(sheets)]);
 const totals=sheets.map(s=>({bank:s.bank,december:juanTotals(s).balances.at(-1)/100}));
 const audit=path.join(os.tmpdir(),'p3-juan-decisions-20261003.json');
 fs.writeFileSync(audit,JSON.stringify({before,beforeCharges,beforeDues,changes,totals},null,2));
 await db.query(process.argv.includes('--write')?'COMMIT':'ROLLBACK');
 console.log(JSON.stringify({mode:process.argv.includes('--write')?'applied':'validated and rolled back',changes:changes.map(c=>({label:c.label,id:c.id,createdCharge:c.createdCharge,createdProvider:c.createdProvider,createdEmployee:c.createdEmployee,name:c.name})),totals,audit}));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
