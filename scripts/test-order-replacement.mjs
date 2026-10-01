import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {replaceContractOrders} from '../server/features/contrato/ReplaceContractOrders.js';
import {createOrderInvoiceDraft,getEligibleOrders,linkOrderToInvoice,getUnassignedInvoices,updateCustomerInvoice} from '../server/features/factura/FacturaClienteRepository.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),schema='test_invoice_'+randomUUID().replaceAll('-','');
const originalConnect=pool.connect.bind(pool),originalQuery=pool.query.bind(pool);
try{
  await db.query('CREATE SCHEMA '+schema);await db.query('SET search_path TO '+schema+',public');
  const tables=['tesoreria_ordenes','tesoreria_recibos_importados','tesoreria_movimientos_bancarios','tesoreria_aplicaciones_cobro','administracion_facturas_clientes','administracion_lineas_factura','comercial_cuentas','comercial_contratos','comercial_contratos_cobros','general_comentarios','general_eventos','cuentas_registro_eventos'];
  for(const table of tables)await db.query('CREATE TABLE '+schema+'.'+table+' (LIKE public.'+table+' INCLUDING ALL)');
  pool.connect=async()=>({query:(...args)=>db.query(...args),release(){}});pool.query=(...args)=>db.query(...args);
  await db.query(`INSERT INTO comercial_cuentas(id_cuenta,nombre_empresa) VALUES('client','Cliente');
    INSERT INTO comercial_contratos(id_contrato,id_cuenta_contrato) VALUES('contract','client');
    INSERT INTO comercial_contratos_cobros(id_cobro_contrato,id_contrato,numero_cobro,fecha_cobro,importe_cobro,forma_cobro,banco_cobro) VALUES('pay','contract',1,'2099-12-30',121,'transferencia','Santander');
    INSERT INTO tesoreria_ordenes(id_orden,id_cuenta,id_contrato,id_cobro_contrato,numero_cobro,base_imponible,cobro_total,forma_cobro,banco_cobro,fecha_teorica_cobro) VALUES('old','client','contract','pay',1,100,121,'transferencia','Santander','2099-12-30');`);
  assert.equal((await getEligibleOrders()).length,1);
  await assert.rejects(replaceContractOrders('contract',['old'],[{importe:120,fecha:'30/12/2099',forma_cobro:'transferencia',banco_cobro:'Santander'}],'actor'),/sumar exactamente/);
  assert.equal((await db.query("SELECT cancelada FROM tesoreria_ordenes WHERE id_orden='old'")).rows[0].cancelada,false);
  const result=await replaceContractOrders('contract',['old'],[{importe:60,fecha:'30/12/2099',forma_cobro:'transferencia',banco_cobro:'Santander'},{importe:61,fecha:'30/01/2100',forma_cobro:'transferencia',banco_cobro:'Santander'}],'actor');
  assert.equal(result.creadas.length,2);assert((await db.query("SELECT cancelada FROM tesoreria_ordenes WHERE id_orden='old'")).rows[0].cancelada);
  assert.equal(Number((await db.query('SELECT SUM(cobro_total)::numeric total FROM tesoreria_ordenes WHERE id_orden=ANY($1)',[result.creadas])).rows[0].total),121);
  await db.query('UPDATE tesoreria_ordenes SET cobrada=true WHERE id_orden=$1',[result.creadas[0]]);
  await assert.rejects(replaceContractOrders('contract',[result.creadas[0]],[{importe:60,fecha:'30/12/2099',forma_cobro:'transferencia',banco_cobro:'Santander'}],'actor'),/pendientes/);
  const invoice=await createOrderInvoiceDraft(result.creadas[1],'actor');assert.equal(invoice.ordenes.length,1);assert.equal(invoice.ordenes[0].id_orden,result.creadas[1]);
  await assert.rejects(updateCustomerInvoice(invoice.id_factura_cliente,{lineas:[{concepto:'Otro total',cantidad:1,precio_unitario:100,base_imponible:100,iva_porcentaje:21}]}),/coincidir/);
  assert.equal((await db.query('SELECT COUNT(*)::int n FROM administracion_lineas_factura WHERE id_factura_cliente=$1',[invoice.id_factura_cliente])).rows[0].n,1);
  assert.equal((await getEligibleOrders()).length,1); // The other new order remains unbilled.
  await db.query("INSERT INTO administracion_facturas_clientes(id_factura_cliente,id_cuenta,importe_total) VALUES('unassigned','client',60)");
  assert.equal((await getUnassignedInvoices('client')).length,1);
  await assert.rejects(linkOrderToInvoice(result.creadas[1],'unassigned','actor'),/disponible/);
  await linkOrderToInvoice(result.creadas[0],'unassigned','actor');
  assert.equal((await db.query("SELECT id_factura FROM tesoreria_ordenes WHERE id_orden=$1",[result.creadas[0]])).rows[0].id_factura,'unassigned');
  console.log('order replacement and invoice source: ok');
}finally{pool.connect=originalConnect;pool.query=originalQuery;await db.query('RESET search_path');await db.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');db.release();await pool.end();}
