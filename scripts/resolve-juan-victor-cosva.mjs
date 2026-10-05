import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
try {
 await db.query('BEGIN');
 await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");
 const book=(await db.query("SELECT * FROM tesoreria_prevision_juan WHERE id='juan-2026' FOR UPDATE")).rows[0];
 const employee=(await db.query("UPDATE agentes_db SET nombre_agente='Víctor',apellidos_agente='Joven Castillo',nombre_completo_agente='Víctor Joven Castillo',estado_agente='activo',is_empleado_account=TRUE,updated_at=now() WHERE lower(btrim(email_agente))='internationalsales@vidrioperfil.com' RETURNING id_agente")).rows;
 if(employee.length!==1)throw Error('Revisar identidad de Víctor.');
 const charge=(await db.query('SELECT * FROM tesoreria_cargos_recurrentes WHERE id_cargo_recurrente=20 FOR UPDATE')).rows[0];
 const rule={...charge.programacion[0],inicio_dia:'3'};
 if((await db.query("SELECT 1 FROM tesoreria_cargos_vencimientos v WHERE id_cargo_recurrente=20 AND fecha>='2026-10-01' AND (EXISTS(SELECT 1 FROM tesoreria_vencimientos_aplicaciones a WHERE a.id_vencimiento=v.id) OR EXISTS(SELECT 1 FROM administracion_tickets t WHERE t.id_vencimiento_tarjeta=v.id))")).rowCount)throw Error('Cosva tiene vencimientos aplicados.');
 await db.query("UPDATE tesoreria_cargos_recurrentes SET programacion=$1::jsonb,banco_pago='Sabadell',updated_at=now() WHERE id_cargo_recurrente=20",[JSON.stringify([rule])]);
 await db.query("UPDATE tesoreria_cargos_vencimientos SET fecha=make_date(extract(year FROM fecha)::int,extract(month FROM fecha)::int,3),programacion=$1::jsonb WHERE id_cargo_recurrente=20 AND fecha>='2026-10-01'",[JSON.stringify({tipo:charge.tipo_programacion,regla:rule})]);
 const row=book.sheets.find(s=>s.bank==='Sabadell').payments.find(r=>r.id==='payments:26');row.day=3;
 await db.query("UPDATE tesoreria_prevision_juan_asociaciones SET status='matched',evidence=jsonb_build_object('reason','Día 3 confirmado por el usuario como estimación. Extractos históricos: 02/03, 01/06 y 21/09.','conflicts','[]'::jsonb,'candidates','[]'::jsonb),updated_at=now() WHERE workbook_id='juan-2026' AND bank='Sabadell' AND row_id=$1",[row.id]);
 await db.query("INSERT INTO tesoreria_prevision_juan_enlaces(workbook_id,cell_key,section,target_id,status,note) VALUES('juan-2026','Sabadell:payments:26:12','payments','20','matched','Día 3 estimado confirmado; cargo Cosva existente.') ON CONFLICT(workbook_id,cell_key) DO UPDATE SET target_id='20',status='matched',note=EXCLUDED.note");
 await db.query("UPDATE tesoreria_prevision_juan SET sheets=$1::jsonb,version=version+1,updated_at=now() WHERE id='juan-2026'",[JSON.stringify(book.sheets)]);
 await db.query('COMMIT');
 console.log('APPLIED: Víctor Joven Castillo activo; Cosva día 3, cargo existente e histórico conservado.');
 console.log('COMMISSIONS',JSON.stringify((await db.query("SELECT banco,fecha_operativa,concepto,importe,id_cargo_recurrente FROM tesoreria_movimientos_bancarios WHERE concepto ~* 'comisi|comiss|mantenim|administraci|gastos.*(remes|transfer)|liquidaci.n.*cuenta' ORDER BY banco,p3_income_date(fecha_operativa)")).rows));
}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await pool.end();}
