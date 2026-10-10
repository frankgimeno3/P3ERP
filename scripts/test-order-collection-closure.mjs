import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {closeOrderCollection,changeOrderCollectionClosure} from '../server/features/orden/OrderCollectionClosure.js';
import {syncInvoiceCollection,reconcileBankIncome} from '../server/features/prevision/IncomeReconciliation.js';

env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),connect=pool.connect;
let depth=0;
const adapter={release(){},async query(sql,args){
  if(sql==='BEGIN')return db.query(`SAVEPOINT s${++depth}`);
  if(sql==='COMMIT')return db.query(`RELEASE SAVEPOINT s${depth--}`);
  if(sql==='ROLLBACK'){await db.query(`ROLLBACK TO SAVEPOINT s${depth}`);return db.query(`RELEASE SAVEPOINT s${depth--}`);}
  return db.query(sql,args);
}};
try {
  await db.query('BEGIN');
  const schema='closure_test_'+randomUUID().replaceAll('-','');
  await db.query(`CREATE SCHEMA ${schema}`);await db.query(`SET LOCAL search_path TO ${schema},public`);
  for(const table of ['tesoreria_ordenes','administracion_facturas_clientes','tesoreria_aplicaciones_cobro','tesoreria_movimientos_bancarios','comercial_cuentas','comercial_contratos','general_comentarios','general_eventos','cuentas_registro_eventos','agentes_db'])
    await db.query(`CREATE TABLE ${table} (LIKE public.${table} INCLUDING ALL)`);
  pool.connect=async()=>adapter;
  await db.query("INSERT INTO comercial_cuentas(id_cuenta,nombre_empresa) VALUES('client','Client')");
  await db.query("INSERT INTO administracion_facturas_clientes(id_factura_cliente,numero_factura,importe_total,cobrada) VALUES('invoice','TEST-CLOSURE',462,false)");
  await db.query(`INSERT INTO tesoreria_ordenes(id_orden,id_cuenta,id_factura,cobro_total,cobrada,forma_cobro) VALUES
    ('main','client','invoice',440,false,'transferencia'),('residual','client','invoice',22,false,'transferencia')`);
  await db.query("INSERT INTO tesoreria_movimientos_bancarios(id_linea_banco,importe,estado_revision,banco,fecha_operativa) VALUES('banc_san_26_000.000.001',440,true,'Santander','09/10/2026')");
  await db.query("INSERT INTO tesoreria_aplicaciones_cobro(id_linea_banco,id_orden,importe) VALUES('banc_san_26_000.000.001','main',440)");
  await db.query("UPDATE tesoreria_ordenes SET cobrada=true,fecha_real_cobro='09/10/2026' WHERE id_orden='main'");
  const order=async()=>(await db.query("SELECT * FROM tesoreria_ordenes WHERE id_orden='residual'")).rows[0];
  const invoice=async()=>(await db.query("SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente='invoice'")).rows[0];
  await assert.rejects(closeOrderCollection(db,await order(),{reason:''}),/motivo/);
  await changeOrderCollectionClosure('residual',{action:'cerrar_cobro',version:(await order()).updated_at,reason:'Assumed difference'});
  const o=await order();let f=await invoice();
  assert.equal(o.cobrada,false);assert.equal(Number(o.cobro_total),22);
  assert.equal(o.datos_importacion.cierre_cobro.diferencia_asumida,22);
  assert.equal(Number(f.importe_total),462);assert.equal(Number(f.importe_cobrado),440);
  assert.equal(f.cobrada,false);assert.equal(f.datos_importacion.gestion_cobro_cerrada,true);
  await assert.rejects(reconcileBankIncome(db,{id_linea_banco:'banc_san_26_000.000.002',importe:22,fecha_valor:'09/10/2026'},{incomeType:'transferencia',orderId:'residual',entityId:'client'}),/cerrada/);
  await syncInvoiceCollection(db,['invoice']);assert.equal((await invoice()).datos_importacion.gestion_cobro_cerrada,true);
  await assert.rejects(changeOrderCollectionClosure('residual',{action:'reabrir_cobro',version:'2000-01-01'}),/cambiado/);
  assert.equal((await order()).datos_importacion.cierre_cobro.activo,true);
  await changeOrderCollectionClosure('residual',{action:'reabrir_cobro',version:o.updated_at});
  assert.equal((await order()).datos_importacion.cierre_cobro.activo,false);
  f=await invoice();assert.equal(f.datos_importacion.gestion_cobro_cerrada,false);assert.equal(Number(f.importe_cobrado),440);
  assert.equal((await db.query('SELECT count(*)::int n FROM tesoreria_aplicaciones_cobro')).rows[0].n,1);
  console.log('Order closure: actual amounts preserved, reversible closure, stale-version rollback passed.');
} finally {pool.connect=connect;await db.query('ROLLBACK');db.release();await pool.end();}
