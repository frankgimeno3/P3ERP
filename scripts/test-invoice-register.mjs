import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import XLSX from 'xlsx';
import {getPgPool} from '../server/database/pgClient.js';
import {parseInvoiceRegister,importInvoiceRegister} from '../server/features/factura/InvoiceRegisterImport.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),schema='test_invoice_register_'+randomUUID().replaceAll('-','');
try{
 await db.query('CREATE SCHEMA '+schema);await db.query('SET search_path TO '+schema+',public');
 for(const table of ['comercial_cuentas','administracion_facturas_clientes','administracion_lineas_factura','tesoreria_ordenes','tesoreria_recibos_importados','tesoreria_remesas','comercial_contratos','tesoreria_aplicaciones_cobro','tesoreria_movimientos_bancarios','general_eventos','general_comentarios'])await db.query('CREATE TABLE '+schema+'.'+table+' (LIKE public.'+table+' INCLUDING ALL)');
 const testPool={connect:async()=>({query:db.query.bind(db),release(){}})};
 await db.query("INSERT INTO comercial_cuentas(id_cuenta,id_edisoft,nombre_empresa) VALUES('client','123','Cliente')");
 await db.query("INSERT INTO administracion_facturas_clientes(id_factura_cliente,numero_factura,id_cuenta,importe_total,base_imponible,fecha_factura) VALUES('canonical','526001','client',121,100,'01/01/2026')");
 await db.query("INSERT INTO tesoreria_remesas(id_remesa) VALUES('R1')");
 await db.query("INSERT INTO tesoreria_ordenes(id_orden,id_factura,id_cuenta,numero_cobro,forma_cobro,cobro_total,base_imponible,cobrada) VALUES('oldorder','canonical','client',1,'recibo',121,100,true)");
 await db.query("INSERT INTO tesoreria_recibos_importados(numero_recibo,numero_factura,numero_cobro,id_orden,id_remesa,importe_recibo) VALUES('526001-001','526001',1,'oldorder','R1',121)");
 // The fixture contains exact Excel serial dates, a negative credit and a reserved number.
 const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([
  ['Nº FRA','FECHA EMISION','CODIGO','CLIENTE','TOTAL NAC + IVA','TOTAL UE','TOTAL RESTO','FORMA DE COBRO'],
  [526001,46034,123,'Cliente',242,null,null,'RECIBO'],[526002,46034,123,'Cliente',121,null,null,'TRANSFER'],['A526003',46034,123,'Cliente',-121,null,null,null],[526004],
 ]),'PUBLI 2026');
 const source=parseInvoiceRegister(XLSX.write(book,{type:'buffer',bookType:'xlsx'}));
 assert.equal(source.rows.length,3);assert.equal(source.reserved.length,1);assert.equal(source.rows[0].fecha,'12/01/2026');
 const preview=await importInvoiceRegister(source.rows,{pool:testPool});assert.equal(preview.summary.created,2);assert.equal(preview.summary.warnings.length,1);
 assert.equal((await db.query('SELECT count(*) n FROM administracion_facturas_clientes')).rows[0].n,'1');
 let backupChecked=false;
 const result=await importInvoiceRegister(source.rows,{apply:true,pool:testPool,beforeApply:backup=>{assert.equal(backup.facturas[0].importe_total,'121');backupChecked=true;}});
 assert(backupChecked);assert.equal(result.summary.updated,1);assert.equal(result.summary.newOrders,1);
 const invoice=(await db.query("SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente='canonical'")).rows[0];assert.equal(invoice.importe_total,'242');assert.equal(invoice.base_imponible,'200');assert.equal(invoice.importe_cobrado,'121');
 assert.equal((await db.query("SELECT id_remesa FROM tesoreria_recibos_importados WHERE id_orden='oldorder'")).rows[0].id_remesa,'R1');
 assert.equal((await db.query("SELECT cobro_total FROM tesoreria_ordenes WHERE id_orden='oldorder'")).rows[0].cobro_total,'121');
 assert.equal((await db.query("SELECT factura_tipo FROM administracion_facturas_clientes WHERE numero_factura='A526003'")).rows[0].factura_tipo,'abono');
 const repeat=await importInvoiceRegister(source.rows,{apply:true,pool:testPool});assert.equal(repeat.summary.created,0);assert.equal(repeat.summary.updated,0);assert.equal(repeat.summary.unchanged,3);
 await db.query("UPDATE administracion_facturas_clientes SET ya_contabilizada=true WHERE id_factura_cliente='canonical'");
 await assert.rejects(importInvoiceRegister(source.rows,{apply:true,pool:testPool}),/bloqueada/);
 assert.equal((await db.query('SELECT count(*) n FROM administracion_facturas_clientes')).rows[0].n,'3');
 console.log('PASS: invoice register parser, exact dates, overwrite canonical invoice, preserved remesa/paid order, credits, backup, dry-run, idempotence and blocked invoice rollback.');
}finally{await db.query('RESET search_path');await db.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');db.release();await pool.end();}
