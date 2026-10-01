import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {lockIncome} from '../server/features/prevision/IncomeReconciliation.js';
import {getOrdenesAdministrativas} from '../server/features/orden/OrdenRepository.js';
import {getHojaProduccionContenidos} from '../server/features/contenido/ContenidoRepository.js';
import {getContratoById,updateContrato} from '../server/features/contrato/ContratoRepository.js';
const folder=path.resolve(process.env.USERPROFILE,'OneDrive/Escritorio/importacion-administracion-produccion-20260920');
const plan=JSON.parse(fs.readFileSync(path.join(folder,'prepared-import.json'),'utf8'));
const decisions=JSON.parse(fs.readFileSync(path.join(folder,'user-decisions.json'),'utf8'));
assert.equal(plan.decisionsDigest,createHash('sha256').update(JSON.stringify(decisions)).digest('hex'),'El plan debe regenerarse con las decisiones actuales antes de ejecutar la importación.');
const apply=process.argv.includes('--apply');
if(apply){
 assert(process.argv.includes('--allow-provisional-accounts')||!plan.requiresApproval.provisionalAccounts.length,'Falta resolver los códigos de cuenta no existentes.');
 assert(process.argv.includes('--preserve-discrepancies')||!plan.warnings.length,'Falta resolver las discrepancias de importes.');
 assert(!fs.existsSync(path.join(folder,'import-committed.json')),'Esta sustitución ya se ha ejecutado.');
}
const keys={agentes_db:'id_agente',comercial_cuentas:'id_cuenta',comercial_contratos:'id_contrato',comercial_contratos_lineas:'id_linea_contrato',comercial_contratos_cobros:'id_cobro_contrato',administracion_facturas_clientes:'id_factura_cliente',administracion_lineas_factura:'id_linea_factura',tesoreria_ordenes:'id_orden',tesoreria_remesas:'id_remesa',tesoreria_recibos_importados:'numero_recibo',produccion_contenidos:'id_contenido'};
env.loadEnvConfig(process.cwd());const pool=getPgPool(),db=await pool.connect();
try{
 await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");await db.query("SET LOCAL statement_timeout='60s'");await lockIncome(db);
 const before={};
 const touched=[...Object.keys(keys),'tesoreria_aplicaciones_cobro','tesoreria_movimientos_bancarios','general_comentarios','produccion_materiales','produccion_revistas_contenidos','produccion_control_redaccion','servicios_paginas_revista','administracion_ferias_ediciones','comercial_suscripciones'];
 for(const table of touched)before[table]=(await db.query(`SELECT row_to_json(t) data FROM "${table}" t`)).rows.map(r=>r.data);
 const oldOrders=before.tesoreria_ordenes.map(o=>o.id_orden);
 const oldContracts=[...new Set(before.tesoreria_ordenes.map(o=>o.id_contrato).filter(Boolean))];
 const plannedOrderIds=plan.tables.tesoreria_ordenes.map(o=>o.id_orden),plannedContentIds=plan.tables.produccion_contenidos.map(c=>c.id_contenido);
 const baseline=JSON.parse(fs.readFileSync(path.join(folder,'tesoreria_ordenes.json'),'utf8'));
 assert.deepEqual([...oldOrders].sort(),baseline.map(o=>o.id_orden).sort(),'Las órdenes cambiaron desde la revisión inicial.');
 const oldInvoices=before.administracion_facturas_clientes.filter(f=>oldContracts.includes(f.id_contrato)||oldOrders.some(id=>before.tesoreria_ordenes.find(o=>o.id_orden===id)?.id_factura===f.id_factura_cliente)).map(f=>f.id_factura_cliente);
 const replacingInvoiceIds=new Set([...oldInvoices,...plan.tables.administracion_facturas_clientes.map(f=>f.id_factura_cliente)]);
 assert(!before.administracion_facturas_clientes.some(f=>replacingInvoiceIds.has(f.id_factura_cliente)&&(f.ya_contabilizada||f.verifactu_estado_envio==='factura emitida')),'Hay facturas cerradas: no se pueden sustituir con este plan.');
 const removedContentIds=before.produccion_contenidos.filter(c=>oldContracts.includes(c.id_contrato)||c.hoja_prod&&!plannedContentIds.includes(c.id_contenido)).map(c=>c.id_contenido);
 fs.writeFileSync(path.join(folder,`before-${apply?'apply':'dry-run'}-${Date.now()}.json`),JSON.stringify(before),{flag:'wx'});
 await db.query(fs.readFileSync('database/migrations/20260920_0003_administrative_production_import.sql','utf8'));
 await db.query('DELETE FROM tesoreria_aplicaciones_cobro WHERE id_orden=ANY($1::text[])',[oldOrders]);
 const obsoleteRemesas=before.tesoreria_recibos_importados.filter(r=>oldOrders.includes(r.id_orden)).map(r=>r.id_remesa).filter(Boolean);
 await db.query('DELETE FROM tesoreria_recibos_importados WHERE id_orden=ANY($1::text[])',[oldOrders]);
 await db.query('DELETE FROM tesoreria_remesas r WHERE id_remesa=ANY($1::text[]) AND NOT EXISTS(SELECT 1 FROM tesoreria_recibos_importados i WHERE i.id_remesa=r.id_remesa)',[obsoleteRemesas]);
 await db.query('UPDATE tesoreria_movimientos_bancarios SET id_orden=NULL,estado_revision=false WHERE id_orden=ANY($1::text[])',[oldOrders]);
 await db.query('DELETE FROM tesoreria_ordenes WHERE id_orden=ANY($1::text[])',[oldOrders]);
 await db.query('DELETE FROM administracion_lineas_factura WHERE id_factura_cliente=ANY($1::text[])',[oldInvoices]);
 await db.query('DELETE FROM administracion_facturas_clientes WHERE id_factura_cliente=ANY($1::text[])',[oldInvoices]);
 await db.query('DELETE FROM comercial_contratos_cobros WHERE id_contrato=ANY($1::text[])',[oldContracts]);
 await db.query('DELETE FROM comercial_contratos_lineas WHERE id_contrato=ANY($1::text[])',[oldContracts]);
 await db.query('DELETE FROM comercial_suscripciones WHERE id_contrato=ANY($1::text[])',[oldContracts]);
 await db.query('UPDATE administracion_ferias_ediciones SET id_contrato=NULL WHERE id_contrato=ANY($1::text[])',[oldContracts]);
 await db.query('DELETE FROM comercial_contratos WHERE id_contrato=ANY($1::text[])',[oldContracts]);
 for(const table of ['produccion_materiales','produccion_revistas_contenidos'])await db.query(`DELETE FROM ${table} WHERE id_contenido=ANY($1::text[])`,[removedContentIds]);
 for(const table of ['produccion_control_redaccion','servicios_paginas_revista'])await db.query(`UPDATE ${table} SET id_contenido=NULL WHERE id_contenido=ANY($1::text[])`,[removedContentIds]);
 await db.query('DELETE FROM produccion_contenidos WHERE id_contenido=ANY($1::text[])',[removedContentIds]);
 await db.query("DELETE FROM general_comentarios WHERE (tipo_entidad='orden' AND id_entidad=ANY($1::text[])) OR (tipo_entidad='contrato' AND id_entidad=ANY($2::text[])) OR (tipo_entidad='factura' AND id_entidad=ANY($3::text[])) OR (tipo_entidad='contenido' AND id_entidad=ANY($4::text[]))",[oldOrders,oldContracts,oldInvoices,removedContentIds]);
 const columns=(await db.query("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public'")).rows;
 for(const [table,rows] of Object.entries(plan.tables))for(const row of rows){
  const fields=Object.keys(row),pk=keys[table];
  const values=fields.map(field=>columns.find(c=>c.table_name===table&&c.column_name===field)?.data_type==='jsonb'?JSON.stringify(row[field]):row[field]);
  await db.query(`INSERT INTO "${table}"(${fields.map(f=>'"'+f+'"').join(',')}) VALUES(${fields.map((_,i)=>'$'+(i+1)).join(',')}) ON CONFLICT ("${pk}") DO UPDATE SET ${fields.filter(f=>f!==pk).map(f=>'"'+f+'"=EXCLUDED."'+f+'"').join(',')}`,values);
 }
 // Marketing is a commercial agent, not an employee or an application user.
 await db.query("UPDATE agentes_db SET is_empleado_account=false WHERE lower(email_agente)='marketing@vidrioperfil.com'");
 const errors=[];
 for(const [table,rows] of Object.entries(plan.tables)){
  const pk=keys[table];const actual=(await db.query(`SELECT * FROM "${table}" WHERE "${pk}"=ANY($1::text[])`,[rows.map(r=>r[pk])])).rows;
  if(actual.length!==rows.length)errors.push(table+': faltan registros');
 }
 const broken=(await db.query(`SELECT o.id_orden FROM tesoreria_ordenes o LEFT JOIN comercial_cuentas a ON a.id_cuenta=o.id_cuenta LEFT JOIN comercial_contratos c ON c.id_contrato=o.id_contrato LEFT JOIN administracion_facturas_clientes f ON f.id_factura_cliente=o.id_factura WHERE o.id_orden=ANY($1::text[]) AND (a.id_cuenta IS NULL OR o.id_contrato IS NOT NULL AND c.id_contrato IS NULL OR o.id_factura IS NOT NULL AND f.id_factura_cliente IS NULL)`,[plannedOrderIds])).rows;
 if(broken.length)errors.push('Referencias de órdenes rotas: '+broken.length);
 const totals=(await db.query('SELECT sum(cobro_total) total FROM tesoreria_ordenes WHERE id_orden=ANY($1::text[])',[plannedOrderIds])).rows[0];
 assert.equal(Math.round(Number(totals.total)*100),plan.tables.tesoreria_ordenes.reduce((n,r)=>n+Math.round(r.cobro_total*100),0));
 const contentCount=(await db.query('SELECT count(*)::int n FROM produccion_contenidos WHERE id_contenido=ANY($1::text[])',[plannedContentIds])).rows[0].n;
 assert.equal(contentCount,plan.tables.produccion_contenidos.length);
 assert.equal((await db.query('SELECT count(*)::int n FROM tesoreria_movimientos_bancarios')).rows[0].n,before.tesoreria_movimientos_bancarios.length);
 assert.deepEqual(errors,[]);
 const originalQuery=pool.query.bind(pool);pool.query=(...args)=>db.query(...args);
 try {
  const ordersView=await getOrdenesAdministrativas();
  assert.equal(ordersView.length,plan.tables.tesoreria_ordenes.length);
  for(const row of ordersView){const expected=plan.tables.tesoreria_ordenes.find(o=>o.id_orden===row.id_orden);assert.equal(row.id_cuenta,expected.id_cuenta);assert.equal(row.id_agente,expected.id_agente||'');}
  const currentView=await getHojaProduccionContenidos({year:'2026'}),previousView=await getHojaProduccionContenidos({year:'Anteriores'});
  assert.equal(currentView.length,999);assert.equal(previousView.length,848);
  const allAccounts=(await db.query('SELECT id_cuenta,nombre_empresa FROM comercial_cuentas')).rows;
  for(const row of [...currentView,...previousView]){const content=plan.tables.produccion_contenidos.find(c=>c.id_contenido===row.id_contenido);assert.equal(row.cliente,allAccounts.find(a=>a.id_cuenta===content.id_cuenta).nombre_empresa);}
  for(const c of plan.tables.comercial_contratos){const detail=await getContratoById(c.id_contrato);assert.equal(detail.lineas_contrato.length,plan.tables.comercial_contratos_lineas.filter(l=>l.id_contrato===c.id_contrato).length);}
  if(!apply){
   const sample=plan.tables.comercial_contratos.find(c=>c.array_contenidos.length);
   const originalAgents=(await db.query('SELECT id_contenido,id_agente FROM produccion_contenidos WHERE id_contrato=$1 ORDER BY id_contenido',[sample.id_contrato])).rows;
   await updateContrato(sample.id_contrato,{id_agente_contrato:'ag_marketing_vidrioperfil'});
   assert.deepEqual((await db.query('SELECT id_contenido,id_agente FROM produccion_contenidos WHERE id_contrato=$1 ORDER BY id_contenido',[sample.id_contrato])).rows,originalAgents);
  }
 }finally{pool.query=originalQuery;}
 for(const [code,adjustment] of Object.entries(decisions.amountOverrides)){
  const contract=(await db.query('SELECT importe_total_bi_contrato,importe_contrato_con_iva FROM comercial_contratos WHERE id_contrato=$1',[code])).rows[0];
  assert.equal(Number(contract.importe_contrato_con_iva),adjustment.total);
  assert.equal(Number(contract.importe_total_bi_contrato),Math.round(adjustment.total/(1+adjustment.vatPercent/100)*100)/100);
 }
 for(const excluded of plan.excludedOrders)assert(!plan.tables.tesoreria_ordenes.some(order=>order.datos_importacion.fila===excluded.row),'Se ha incluido una orden excluida');
 const result={mode:apply?'committed':'rolled-back',decisionsDigest:plan.decisionsDigest,excludedOrders:plan.excludedOrders,counts:plan.totals,totalOrders:Number(totals.total),warnings:plan.warnings,checks:'counts, order references, monetary total, production count, approved bases, excluded orders and bank preservation passed'};
 await db.query(apply?'COMMIT':'ROLLBACK');
 fs.writeFileSync(path.join(folder,apply?'import-committed.json':'dry-run-result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
