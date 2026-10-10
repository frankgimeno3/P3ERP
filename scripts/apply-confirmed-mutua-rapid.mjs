import env from '@next/env';import fs from 'node:fs/promises';import path from 'node:path';
import {getPgPool} from '../server/database/pgClient.js';
import {saveWorkflowExpense} from '../server/features/banco/BankWorkflowExpense.js';
import {reconcileBankIncome} from '../server/features/prevision/IncomeReconciliation.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool(),db=await pool.connect(),apply=process.argv.includes('--apply');
try {
 await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");await db.query("SELECT pg_advisory_xact_lock(hashtext('ingresos:conciliacion'))");
 const lines=(await db.query("SELECT * FROM tesoreria_movimientos_bancarios WHERE id_linea_banco IN ('banc_sab_26_000.000.145','banc_sab_26_000.000.493') ORDER BY id_linea_banco FOR UPDATE")).rows;
 const mutua=lines.find(l=>l.id_linea_banco.endsWith('.145')),rapid=lines.find(l=>l.id_linea_banco.endsWith('.493'));
 const invoice=(await db.query("SELECT * FROM administracion_facturas_proveedores WHERE id_factura_proveedor='O26.T3.0047' FOR UPDATE")).rows[0];
 if(Number(mutua.importe)!==368.81||Number(rapid.importe)!==-1512.07||Number(invoice.importe_total)!==1512.08||invoice.id_proveedor!=='prov_excel_rapid_envios')throw Error('Los datos confirmados han cambiado');
 const plan={mutua:!mutua.estado_revision,rapid:!rapid.estado_revision,acceptedDifference:0.01};
 if(!apply||(!plan.mutua&&!plan.rapid)){await db.query('ROLLBACK');console.log(JSON.stringify({applied:false,plan}));}
 else {
  const directory=path.join(process.env.USERPROFILE,'Downloads','p3erp-cierre-bancos-20261009');await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,`before-mutua-rapid-${Date.now()}.json`),JSON.stringify({lines,invoice},null,2),{flag:'wx'});
  await db.query(await fs.readFile('database/migrations/20261009_0002_payment_difference_closure.sql','utf8'));
  if(plan.mutua){await reconcileBankIncome(db,mutua,{incomeType:'otro'},'');await db.query("UPDATE tesoreria_movimientos_bancarios SET comentarios=concat_ws(E'\n',NULLIF(comentarios,''),$2::text) WHERE id_linea_banco=$1",[mutua.id_linea_banco,'Usuario confirma 09/10/2026: devolución Mutua Madrileña por rectificación de un cargo indebido. Ingreso extraordinario, sin recurrencia.']);}
  if(plan.rapid) {
   if(rapid.id_proveedor||rapid.id_pago||rapid.id_cargo_recurrente||(await db.query('SELECT 1 FROM tesoreria_pagos_previstos WHERE id_factura_proveedor=$1',[invoice.id_factura_proveedor])).rowCount)throw Error('Rapid ya tiene una asociación; recargar');
   const id='payment_documented_O26.T3.0047',closure={activo:true,previsto:1512.08,real:1512.07,diferencia:0.01,fecha:'2026-10-09',motivo:'Usuario confirma asumir un céntimo y cerrar la revisión; se conservan el total de la factura y el cargo bancario.',movimientos:[rapid.id_linea_banco]};
   await db.query(`INSERT INTO tesoreria_pagos_previstos(id_pago,id_factura_proveedor,id_proveedor,cuenta_pago,fecha_pago,bi_pago,total_pago,forma_pago,nombre_planificacion,comentarios,cierre_pago) VALUES($1,$2,$3,'Sabadell',$4,$5,$6,'recibo','Rapid Envíos · factura 0121/2026',$7,$8::jsonb)`,[id,invoice.id_factura_proveedor,invoice.id_proveedor,rapid.fecha_operativa,invoice.base_imponible,invoice.importe_total,closure.motivo,JSON.stringify(closure)]);
   await saveWorkflowExpense(db,{mode:'review'},rapid,{entityType:'proveedor',entityId:invoice.id_proveedor,paymentId:id,commentsEdited:true,comments:'Usuario confirma cierre 09/10/2026: factura 0121/2026 de 1.512,08 €, pago real de 1.512,07 € y diferencia asumida de 0,01 €. Se preservan los importes documentales.'},new Map());
  }
  await db.query('COMMIT');console.log(JSON.stringify({applied:true,plan}));
 }
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
