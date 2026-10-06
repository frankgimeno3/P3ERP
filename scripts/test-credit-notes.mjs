import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {planCreditOrders,applyCreditNote} from '../server/features/factura/CreditNotes.js';
assert.equal(planCreditOrders(121,121,[{id_orden:'x',cobro_total:121}]).changes[0].cancel,true);
assert.equal(planCreditOrders(121,60.5,[{id_orden:'x',cobro_total:121}]).changes[0].total,60.5);
assert.equal(planCreditOrders(121,100,[{id_orden:'x',cobro_total:21,cobrada:true}]).changes.length,0);
assert.throws(()=>planCreditOrders(121,122,[]),/superan/);
assert.throws(()=>planCreditOrders(121,121,[{id_orden:'x',cobro_total:121,id_remesa:'sent'}]),/remesa/);
assert.throws(()=>planCreditOrders(121,121,[{id_orden:'x',cobro_total:121,has_applications:true}]),/parciales/);
env.loadEnvConfig(process.cwd());const pool=getPgPool(),db=await pool.connect(),schema='test_credit_'+randomUUID().replaceAll('-','');
try{
  await db.query('CREATE SCHEMA '+schema);await db.query('SET search_path TO '+schema+',public');
  for(const table of ['administracion_facturas_clientes','tesoreria_ordenes','tesoreria_recibos_importados','tesoreria_aplicaciones_cobro','tesoreria_movimientos_bancarios','comercial_contratos_cobros','comercial_contratos','comercial_cuentas','general_comentarios','general_eventos','cuentas_registro_eventos'])await db.query('CREATE TABLE '+schema+'.'+table+' (LIKE public.'+table+' INCLUDING ALL)');
  await db.query("INSERT INTO comercial_cuentas(id_cuenta,nombre_empresa) VALUES('c','TEST')");
  await db.query("INSERT INTO administracion_facturas_clientes(id_factura_cliente,numero_factura,id_cuenta,importe_total,factura_tipo,factura_origen_id,fecha_emision) VALUES('original','526001','c',121,'ordinaria',NULL,'2026-10-06'),('credit','A526001','c',-121,'abono','original','2026-10-06')");
  await db.query("INSERT INTO tesoreria_ordenes(id_orden,id_factura,id_cuenta,cobro_total,fecha_teorica_cobro) VALUES('pending','original','c',121,'15/11/2026')");
  await db.query('BEGIN');await applyCreditNote(db,'credit');await db.query('COMMIT');
  const order=(await db.query("SELECT * FROM tesoreria_ordenes WHERE id_orden='pending'")).rows[0];assert.equal(order.cancelada,true);assert.equal(order.fecha_teorica_cobro,null);assert.equal(order.fecha_real_cobro,null);assert.equal(order.cobrada,false);assert.equal(order.cancelacion_detalle.numero_abono,'A526001');
  assert.equal((await applyCreditNote(db,'credit')).alreadyApplied,true);
  await db.query("INSERT INTO administracion_facturas_clientes(id_factura_cliente,numero_factura,id_cuenta,importe_total,factura_tipo,factura_origen_id,fecha_emision) VALUES('duplicate','A526002','c',-1,'abono','original','2026-10-06')");
  await assert.rejects(applyCreditNote(db,'duplicate'),/superan/);
  assert.equal((await db.query('SELECT count(*)::int n FROM tesoreria_ordenes')).rows[0].n,1);
  console.log('PASS: credit cancellation preserves history and paid status, partial credits, remittance/collection protection, duplicate application and over-credit rejection.');
}finally{await db.query('ROLLBACK');await db.query('SET search_path TO public');await db.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');db.release();await pool.end();}
