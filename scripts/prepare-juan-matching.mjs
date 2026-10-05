import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {prepareJuanMatches} from '../server/features/prevision/JuanMatching.js';
import {insertRecurringCharge} from '../server/features/prevision/RecurringChargeRepository.js';
import {plannedJuanCells} from '../server/features/prevision/JuanExcel.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool();
try {
const workbook=(await pool.query("SELECT * FROM tesoreria_prevision_juan WHERE id='juan-2026'")).rows[0];
const suppliers=(await pool.query('SELECT id_proveedor,nombre_proveedor,nombre_fiscal_proveedor FROM administracion_proveedores ORDER BY nombre_proveedor')).rows;
const employees=(await pool.query('SELECT id_agente,nombre_completo_agente,nombre_agente,apellidos_agente FROM agentes_db WHERE is_empleado_account=TRUE')).rows;
const charges=(await pool.query(`SELECT cr.*,p.nombre_proveedor,p.nombre_fiscal_proveedor,COALESCE(NULLIF(a.nombre_completo_agente,''),trim(concat_ws(' ',a.nombre_agente,a.apellidos_agente))) empleado
 FROM tesoreria_cargos_recurrentes cr LEFT JOIN administracion_proveedores p USING(id_proveedor) LEFT JOIN agentes_db a ON a.id_agente=cr.id_agente WHERE cr.activo ORDER BY cr.id_cargo_recurrente`)).rows;
const dues=(await pool.query("SELECT id,id_cargo_recurrente,id_regla,to_char(fecha,'YYYY-MM-DD') fecha,importe FROM tesoreria_cargos_vencimientos WHERE fecha BETWEEN '2026-10-01' AND '2026-12-31' ORDER BY id_cargo_recurrente,fecha")).rows;
const cards=(await pool.query('SELECT * FROM tesoreria_tarjetas')).rows;
const matches=prepareJuanMatches(workbook.sheets,suppliers,employees,charges,dues);
const report={workbook,suppliers,employees,charges,dues,cards,matches};
const output=path.join(os.tmpdir(),'p3-juan-matching.json');fs.writeFileSync(output,JSON.stringify(report,null,2));
console.log('AUDIT',output);
console.log('MATCHES',JSON.stringify(matches.map(match=>({bank:match.bank,label:match.label,status:match.status,provider:match.providerId,employee:match.employeeId,charges:match.chargeIds,conflicts:match.evidence.conflicts,candidates:match.evidence.candidates}))));
if(process.argv.includes('--write')) {
 const db=await pool.connect();
 try {
  await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
  await db.query(fs.readFileSync('database/migrations/20261003_0002_juan_matching.sql','utf8'));
  const latest=(await db.query("SELECT * FROM tesoreria_prevision_juan WHERE id='juan-2026' FOR UPDATE")).rows[0];
  if(latest.version!==workbook.version)throw Error('La hoja ha cambiado: vuelve a preparar las asociaciones.');
  const cells=plannedJuanCells(workbook.sheets);
  let created=0,linked=0;
  for(const match of matches) {
   // First batch only: identifiable suppliers, no existing recurring charge,
   // and explicit bank/month/day/amount in Juan. All conflicts remain proposals.
   if(match.status==='ready_to_create'&&['COYOTE','TELEFONICA','AIGUES','VODAFONE'].includes(match.label)) {
    const existing=(await db.query('SELECT id_cargo_recurrente FROM tesoreria_cargos_recurrentes WHERE activo AND id_proveedor=$1',[match.providerId])).rows;
    const oneOffs=(await db.query("SELECT id_pago FROM tesoreria_pagos_previstos WHERE id_proveedor=$1 AND p3_income_date(fecha_pago) BETWEEN '2026-10-01' AND '2026-12-31'",[match.providerId])).rows;
    const prior=(await db.query("SELECT * FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id='juan-2026' AND bank=$1 AND row_id=$2",[match.bank,match.rowId])).rows[0];
    if(prior?.status==='integrated'){match.chargeIds=prior.charge_ids;match.status='integrated';}
    else {
     if(existing.length||oneOffs.length)throw Error(`Hay una nueva previsión para ${match.label}; revisa el cruce antes de crearla.`);
     const charge=await insertRecurringCharge(db,{tipo_cargo:'proveedor',id_proveedor:match.providerId,banco_pago:match.bank,tipo_programacion:'fechas',termina_planificacion:true,programacion:match.evidence.future.map(target=>({dia:target.day,mes:target.month,anio:2026,total_iva:target.amount/100,base_imponible:0,descripcion:`${match.label} · Excel Juan 2026 · total bancario; base e IVA pendientes de desglose`}))});
     match.chargeIds=[String(charge.id_cargo_recurrente)];match.status='integrated';created++;
    }
   }
   await db.query(`INSERT INTO tesoreria_prevision_juan_asociaciones(workbook_id,bank,row_id,status,provider_id,employee_id,charge_ids,evidence)
    VALUES('juan-2026',$1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)
    ON CONFLICT(workbook_id,bank,row_id) DO UPDATE SET status=EXCLUDED.status,provider_id=EXCLUDED.provider_id,employee_id=EXCLUDED.employee_id,charge_ids=EXCLUDED.charge_ids,evidence=EXCLUDED.evidence,updated_at=now()`,[match.bank,match.rowId,match.status,match.providerId,match.employeeId,JSON.stringify(match.chargeIds),JSON.stringify({...match.evidence,label:match.label,section:match.section})]);
   // A conflict retains the association in the proposal, never a false operational link.
   if(['matched','integrated'].includes(match.status)&&match.chargeIds.length===1) for(const cell of cells.filter(cell=>cell.bank===match.bank&&cell.rowId===match.rowId)) {
    await db.query(`INSERT INTO tesoreria_prevision_juan_enlaces(workbook_id,cell_key,section,target_id,status,note)
      VALUES('juan-2026',$1,$2,$3,$4,$5) ON CONFLICT(workbook_id,cell_key) DO NOTHING`,[cell.key,cell.section,match.chargeIds[0],match.status,'Asociación a cargo recurrente existente; sin duplicar la previsión.']);linked++;
   }
  }
  await db.query("UPDATE tesoreria_prevision_juan SET version=version+1,updated_at=now() WHERE id='juan-2026'");
  await db.query('COMMIT');console.log(JSON.stringify({createdCharges:created,linkedCells:linked,preparedRows:matches.length}));
 }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
}finally{await pool.end();}
