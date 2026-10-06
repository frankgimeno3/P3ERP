import env from '@next/env';
import {mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getPgPool} from '../server/database/pgClient.js';
import {matchInvoiceCustomers} from '../server/features/factura/InvoiceCustomerMatching.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
try{
  await db.query('BEGIN');
  const apply=process.argv.includes('--apply');
  if(apply)await db.query('LOCK TABLE administracion_facturas_clientes,tesoreria_ordenes,comercial_cuentas,comercial_contratos IN SHARE ROW EXCLUSIVE MODE');
  const invoices=(await db.query('SELECT * FROM administracion_facturas_clientes')).rows;
  const accounts=(await db.query('SELECT id_cuenta,nombre_empresa,nombre_fiscal,pais_facturacion,pais_cuenta FROM comercial_cuentas')).rows;
  const orders=(await db.query('SELECT id_orden,id_factura,id_cuenta,id_contrato,forma_cobro FROM tesoreria_ordenes')).rows;
  const contracts=(await db.query('SELECT id_contrato,id_cuenta_contrato FROM comercial_contratos')).rows;
  const result=matchInvoiceCustomers(invoices,accounts,orders,contracts);
  const directory=join(tmpdir(),'p3-invoice-register');await mkdir(directory,{recursive:true});
  if(apply){
    await writeFile(join(directory,`customer-backup-${Date.now()}.json`),JSON.stringify(invoices.filter(invoice=>result.patches.some(item=>item.id===invoice.id_factura_cliente)),null,2));
    for(const item of result.patches){const fields=Object.keys(item.patch);await db.query(`UPDATE administracion_facturas_clientes SET ${fields.map((field,index)=>`${field}=$${index+2}`).join(',')},updated_at=NOW() WHERE id_factura_cliente=$1`,[item.id,...fields.map(field=>item.patch[field])]);}
  }
  await db.query(apply?'COMMIT':'ROLLBACK');
  await writeFile(join(directory,'customer-reconciliation.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify({applied:apply,invoices:invoices.length,changes:result.patches.length,accountsChanged:result.patches.filter(item=>item.patch.id_cuenta).length,paymentFilled:result.patches.filter(item=>item.patch.forma_cobro).length,totalsFilled:result.patches.filter(item=>item.patch.total_nac_iva!=null).length,unresolved:result.unresolved},null,2));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
