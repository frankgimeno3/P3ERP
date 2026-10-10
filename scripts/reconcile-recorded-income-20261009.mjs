// Atomic backfill for exact receipts already marked paid by the imported ledger.
import env from '@next/env';import fs from 'node:fs/promises';import path from 'node:path';
import {getPgPool} from '../server/database/pgClient.js';import {reconcileBankIncome} from '../server/features/prevision/IncomeReconciliation.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool(),db=await pool.connect(),apply=process.argv.includes('--apply');
const targets=[{id:'banc_sab_26_000.000.028',account:'ACC1798',orders:['C25.000.192-1/1']},{id:'banc_sab_26_000.000.317',account:'ACC145',orders:['C26.000.026-1/1','C26.000.097-1/1']},{id:'banc_sab_26_000.000.013',account:'ACC6',orders:['C25.000.162-1/1']},{id:'banc_sab_26_000.000.240',account:'ACC1878',orders:['C26.000.074-1/1']}];
try {
 await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");await db.query("SELECT pg_advisory_xact_lock(hashtext('laboral:pagos'))");await db.query("SELECT pg_advisory_xact_lock(hashtext('ingresos:conciliacion'))");
 const snapshots=[],plan=[];
 for(const target of targets) {
  const line=(await db.query('SELECT * FROM tesoreria_movimientos_bancarios WHERE id_linea_banco=$1 FOR UPDATE',[target.id])).rows[0];if(!line||Number(line.importe)<=0||line.duplicado_descartado)throw Error('Movimiento no válido');
  if(line.estado_revision){if((await db.query('SELECT id_orden FROM tesoreria_aplicaciones_cobro WHERE id_linea_banco=$1',[target.id])).rowCount!==target.orders.length)throw Error('Revisión anterior distinta');continue;}
  const orders=(await db.query('SELECT * FROM tesoreria_ordenes WHERE id_orden=ANY($1::text[]) ORDER BY id_orden FOR UPDATE',[target.orders])).rows;
  if(orders.length!==target.orders.length||orders.some(o=>!o.cobrada||o.cobro_revision_bancaria||o.cancelada||o.datos_importacion?.cierre_cobro?.activo))throw Error('Los cobros ya no corresponden al registro manual confirmado');
  if(orders.reduce((n,o)=>n+Math.round(Number(o.cobro_total)*100),0)!==Math.round(Number(line.importe)*100))throw Error('El total no coincide');
  if((await db.query('SELECT 1 FROM tesoreria_aplicaciones_cobro WHERE id_orden=ANY($1::text[])',[target.orders])).rowCount)throw Error('Ya existe aplicación bancaria');
  const owners=(await db.query(`SELECT COALESCE(NULLIF(o.id_cuenta,''),c.id_cuenta_contrato,f.id_cuenta) account,f.numero_factura,f.importe_total,to_char(p3_income_date(f.fecha_factura),'YYYY-MM-DD') invoice_date
   FROM tesoreria_ordenes o LEFT JOIN comercial_contratos c USING(id_contrato) LEFT JOIN administracion_facturas_clientes f ON f.id_factura_cliente=o.id_factura WHERE o.id_orden=ANY($1::text[])`,[target.orders])).rows;
  const allInvoiced=owners.every(o=>o.numero_factura);
  if(owners.length!==orders.length||owners.some(o=>o.account!==target.account)||allInvoiced&&owners.reduce((n,o)=>n+Math.round(Number(o.importe_total)*100),0)!==Math.round(Number(line.importe)*100)||!allInvoiced&&orders.some(o=>o.fecha_teorica_cobro!==line.fecha_operativa||o.banco_cobro!==line.banco))throw Error('Documentos, cliente o fecha no coinciden');
  snapshots.push({line,orders,owners});plan.push({...target,amount:Number(line.importe),invoices:owners.map((o,i)=>o.numero_factura||`orden ${orders[i].id_orden}`)});
 }
 const directory=path.join(process.env.USERPROFILE,'Downloads','p3erp-cierre-bancos-20261009');await fs.mkdir(directory,{recursive:true});
 if(!apply||!plan.length){await db.query('ROLLBACK');console.log(JSON.stringify({applied:false,plan}));}
 else {
  await fs.writeFile(path.join(directory,`before-recorded-income-${Date.now()}.json`),JSON.stringify(snapshots,null,2),{flag:'wx'});
  for(const target of plan){
   // No intermediate unpaid state is visible: reconciliation restores it in this transaction.
   await db.query('UPDATE tesoreria_ordenes SET cobrada=false WHERE id_orden=ANY($1::text[])',[target.orders]);
   await reconcileBankIncome(db,snapshots.find(s=>s.line.id_linea_banco===target.id).line,{incomeType:'transferencia',entityId:target.account,orderIds:target.orders},'');
   await db.query("UPDATE tesoreria_movimientos_bancarios SET comentarios=concat_ws(E'\n',NULLIF(comentarios,''),$2::text) WHERE id_linea_banco=$1",[target.id,`Revisión documental 09/10/2026: cliente y total exacto de ${target.invoices.join(', ')}. Se vincula el extracto a cobros ya registrados manualmente; no se duplica el cobro.`]);
  }
  await db.query('COMMIT');console.log(JSON.stringify({applied:true,plan}));
 }
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
