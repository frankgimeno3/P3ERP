import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {nextJuanSheets} from '../server/features/prevision/JuanAnnual.js';
import {extendCharge} from '../server/features/prevision/RecurringChargePlanning.js';
env.loadEnvConfig(process.cwd());const p=getPgPool(),db=await p.connect();
try {
 await db.query('BEGIN');await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
 const sant=(await db.query("SELECT c.* FROM tesoreria_cargos_recurrentes c JOIN tesoreria_prevision_juan_asociaciones a ON a.charge_ids @> to_jsonb(ARRAY[c.id_cargo_recurrente::text]) WHERE a.workbook_id='juan-2026' AND a.bank='Santander' AND a.row_id='payments:42' FOR UPDATE OF c")).rows[0];
 const rule={...sant.programacion[0],cada:1,unidad:'meses',inicio_dia:'26',inicio_mes:'10',inicio_anio:'2026'};delete rule.dia;delete rule.mes;delete rule.anio;
 const updated=(await db.query("UPDATE tesoreria_cargos_recurrentes SET tipo_programacion='periodicidad',programacion=$1::jsonb,termina_planificacion=FALSE,updated_at=now() WHERE id_cargo_recurrente=$2 RETURNING *",[JSON.stringify([rule]),sant.id_cargo_recurrente])).rows[0];
 await db.query("UPDATE tesoreria_cargos_vencimientos SET id_regla=$1,programacion=$2::jsonb WHERE id_cargo_recurrente=$3 AND fecha>='2026-10-01'",[rule.id_regla,JSON.stringify({tipo:'periodicidad',regla:rule}),sant.id_cargo_recurrente]);
 await extendCharge(db,updated);
 const prior=(await db.query("SELECT * FROM tesoreria_prevision_juan WHERE id='juan-2026'")).rows[0];
 const target=(await db.query("SELECT * FROM tesoreria_prevision_juan WHERE id='juan-2027' FOR UPDATE")).rows[0];
 if(target.version!==1)throw Error('2027 ya ha sido editado: no sobrescribir su base.');
 const charges=(await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE activo')).rows;
 const associations=(await db.query("SELECT * FROM tesoreria_prevision_juan_asociaciones WHERE workbook_id='juan-2026'")).rows;
 const sheets=nextJuanSheets(prior.sheets,2027,charges,associations);
 await db.query("UPDATE tesoreria_prevision_juan SET sheets=$1::jsonb,original_sheets=$1::jsonb,updated_at=now() WHERE id='juan-2027'",[JSON.stringify(sheets)]);
 await db.query("UPDATE tesoreria_prevision_juan_asociaciones SET status='matched',evidence=jsonb_build_object('reason','Mantenimiento mensual de Santander según programación vigente.','conflicts','[]'::jsonb,'candidates','[]'::jsonb) WHERE workbook_id='juan-2027' AND bank='Santander' AND row_id='payments:42'");
 for(let month=1;month<=12;month++)await db.query("INSERT INTO tesoreria_prevision_juan_enlaces(workbook_id,cell_key,section,target_id,status,note) VALUES('juan-2027',$1,'payments',$2,'matched','Mantenimiento mensual vigente') ON CONFLICT DO NOTHING",[`Santander:payments:42:${month}`,String(sant.id_cargo_recurrente)]);
 await db.query('COMMIT');console.log('2027 base finalized; Santander monthly recurrence retained through planning horizon.');
}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await p.end();}
