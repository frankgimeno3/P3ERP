// User-confirmed typo 525116 -> 526116; preserve the collected contract order.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {replaceOperationalIdentifiers} from '../server/features/identifiers/IdentifierNormalization.js';
import {syncInvoiceCollection} from '../server/features/prevision/IncomeReconciliation.js';
env.loadEnvConfig(process.cwd());
const q=s=>'"'+s.replaceAll('"','""')+'"';
const folder='C:/Users/frank/Downloads/p3erp-identificadores-20261009';
const orderId='C26.000.106-1/1',duplicateId='ord_fac_reg_1f9faa8356923f48239d0299';
const pool=getPgPool(),db=await pool.connect();
const nativeQuery=db.query.bind(db);
db.query=(text,values)=>nativeQuery({text,values,query_timeout:30000});
db.on('error',()=>{});
try{
 await db.query('BEGIN');
 await db.query("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s'");
 if(!(await db.query("SELECT pg_try_advisory_xact_lock(hashtext('ingresos:conciliacion')) locked")).rows[0].locked)throw Error('Hay otra operación de cobros activa.');
 const tables=(await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")).rows.map(t=>t.table_name);
 await db.query(`LOCK TABLE ${tables.map(q).join(',')} IN SHARE ROW EXCLUSIVE MODE`);
 const order=(await db.query('SELECT * FROM tesoreria_ordenes WHERE id_orden=$1',[orderId])).rows[0];
 const duplicate=(await db.query('SELECT * FROM tesoreria_ordenes WHERE id_orden=$1',[duplicateId])).rows[0];
 const invoices=(await db.query("SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente IN('525116','526116')")).rows;
 const old=invoices.find(f=>f.id_factura_cliente==='525116'),current=invoices.find(f=>f.id_factura_cliente==='526116');
 assert(order&&duplicate&&old&&current,'Unexpected MECAL state: no operation applied');
 for(const item of [order,duplicate,old,current])assert.equal(Math.round(Number(item.cobro_total??item.importe_total)*100),189486);
 assert(order.cobrada&&order.cobro_revision_bancaria&&!order.cancelada);
 assert.equal(order.id_contrato,'C26.000.106');assert.equal(order.id_factura,'525116');
 assert.equal(order.id_cuenta,current.id_cuenta);assert.equal(old.id_cuenta,current.id_cuenta);
 assert(!duplicate.cobrada&&!duplicate.cobro_revision_bancaria&&!duplicate.id_contrato);
 assert(!old.verifactu_sent_at&&!old.verifactu_accepted_at&&!old.ya_contabilizada);
 const receipts=(await db.query('SELECT * FROM tesoreria_recibos_importados WHERE id_orden=ANY($1::text[])',[[orderId,duplicateId]])).rows;
 const receipt=receipts.find(r=>r.id_orden===orderId),extraReceipt=receipts.find(r=>r.id_orden===duplicateId);
 assert.equal(receipts.length,2);assert.equal(receipt.id_remesa,'R26049-20.07-PUB');assert.equal(receipt.numero_recibo,'525116-001');
 assert.equal(extraReceipt.numero_recibo,'526116-001');assert(!extraReceipt.id_remesa);
 assert.equal((await db.query('SELECT count(*)::int n FROM tesoreria_aplicaciones_cobro WHERE id_orden=$1',[duplicateId])).rows[0].n,0);
 const oldLines=(await db.query("SELECT * FROM administracion_lineas_factura WHERE id_factura_cliente='525116'")).rows;
 assert.equal(oldLines.length,1);assert(oldLines[0].precio_no_desglosado);
 const detailed=(await db.query("SELECT * FROM administracion_lineas_factura WHERE id_factura_cliente='526116' ORDER BY posicion")).rows;
 assert.equal(detailed.length,3);assert.equal(Math.round(detailed.reduce((s,l)=>s+Number(l.importe_total),0)*100),189486);
 const documents=(await db.query("SELECT id_documento,sha256,octet_length(contenido) bytes FROM administracion_facturas_documentos WHERE id_factura_cliente='526116'")).rows;
 assert.equal(documents.length,1);
 const bank=(await db.query('SELECT to_jsonb(t) row FROM tesoreria_movimientos_bancarios t ORDER BY id_linea_banco')).rows;
 const applications=(await db.query('SELECT to_jsonb(t) row FROM tesoreria_aplicaciones_cobro t ORDER BY id_linea_banco,id_orden')).rows;
 const counts={};for(const table of tables)counts[table]=(await db.query(`SELECT count(*)::int n FROM ${q(table)}`)).rows[0].n;
 const columns=(await db.query("SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' AND data_type IN('text','character varying','json','jsonb','ARRAY')")).rows;
 const keys=(await db.query("SELECT k.table_name,k.column_name FROM information_schema.table_constraints t JOIN information_schema.key_column_usage k USING(constraint_catalog,constraint_schema,constraint_name) WHERE t.table_schema='public' AND t.constraint_type='PRIMARY KEY' ORDER BY k.ordinal_position")).rows;
 const map=new Map([['525116','526116'],[duplicateId,orderId],['525116-001','526116-001'],[oldLines[0].id_linea_factura,detailed[0].id_linea_factura]]);
 const affected=[];
 for(const table of tables){
  const cols=columns.filter(c=>c.table_name===table);if(!cols.length)continue;
  const clauses=cols.map(c=>['text','character varying'].includes(c.data_type)?`${q(c.column_name)}=ANY($1::text[])`:`EXISTS(SELECT 1 FROM unnest($1::text[]) v WHERE strpos(${q(c.column_name)}::text,v)>0)`);
  const binary=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND data_type='bytea'",[table])).rows;
  const expression=binary.reduce((s,c)=>s+"-'"+c.column_name+"'",'to_jsonb(t)');
  const rows=(await db.query(`SELECT ${expression} value FROM ${q(table)} t WHERE ${clauses.join(' OR ')}`,[[...map.keys()]])).rows.map(r=>r.value);
  if(rows.length)affected.push({table,rows});
 }
 const backup=folder+'/before-mecal-unification-'+Date.now()+'.json';
 await fs.writeFile(backup,JSON.stringify({order,duplicate,invoices,receipts,oldLines,detailed,documents,affected,counts,bank,applications},null,2),{flag:'wx'});
 // Remove only the duplicate receipt and its redundant global invoice line.
 await db.query('DELETE FROM tesoreria_recibos_importados WHERE numero_recibo=$1',[extraReceipt.numero_recibo]);
 await db.query('DELETE FROM administracion_lineas_factura WHERE id_linea_factura=$1',[oldLines[0].id_linea_factura]);
 for(const group of affected){
  if(group.table==='general_identificadores_alias')continue;
  const cols=columns.filter(c=>c.table_name===group.table),pk=keys.filter(k=>k.table_name===group.table).map(k=>k.column_name);
  for(const row of group.rows){
   if(group.table==='administracion_facturas_clientes'&&row.id_factura_cliente==='525116')continue;
   if(group.table==='tesoreria_ordenes'&&row.id_orden===duplicateId)continue;
   if(group.table==='tesoreria_recibos_importados'&&row.numero_recibo===extraReceipt.numero_recibo)continue;
   if(group.table==='administracion_lineas_factura'&&row.id_linea_factura===oldLines[0].id_linea_factura)continue;
   const changes=cols.flatMap(c=>{
    const value=row[c.column_name];
    const next=['text','character varying'].includes(c.data_type)?map.get(value)||value:replaceOperationalIdentifiers(value,map);
    return JSON.stringify(value)===JSON.stringify(next)?[]:[{...c,value:next}];
   });
   if(!changes.length)continue;assert(pk.length,'Reference without primary key');
   const values=changes.map(c=>['json','jsonb'].includes(c.data_type)?JSON.stringify(c.value):c.value);
   const result=await db.query(`UPDATE ${q(group.table)} SET ${changes.map((c,i)=>q(c.column_name)+'=$'+(i+1)).join(',')} WHERE ${pk.map((k,i)=>q(k)+' IS NOT DISTINCT FROM $'+(changes.length+i+1)).join(' AND ')}`,[...values,...pk.map(k=>row[k])]);
   assert.equal(result.rowCount,1);
  }
 }
 await db.query(`UPDATE administracion_facturas_clientes SET id_contrato=$2,id_orden_origen=$3,
  datos_importacion=COALESCE(datos_importacion,'{}'::jsonb)||$4::jsonb,updated_at=now() WHERE id_factura_cliente=$1`,
 ['526116',order.id_contrato,orderId,JSON.stringify({mecal_unificacion:{motivo:'Errata 525116 confirmada por el usuario; factura real 526116.',source:{factura:old,orden:duplicate,recibo:extraReceipt,linea:oldLines[0]},backup}})]);
 await db.query('DELETE FROM tesoreria_ordenes WHERE id_orden=$1',[duplicateId]);
 await db.query("DELETE FROM administracion_facturas_clientes WHERE id_factura_cliente='525116'");
 await syncInvoiceCollection(db,['526116']);
 for(const [entity,previous,actual] of [['orden',duplicateId,orderId],['factura','525116','526116'],['recibo','525116-001','526116-001']]){
  await db.query('INSERT INTO general_identificadores_alias(entidad,id_anterior,id_actual,motivo) VALUES($1,$2,$3,$4)',[entity,previous,actual,'Unificación MECAL confirmada; errata del control administrativo.']);
 }
 const finalOrder=(await db.query('SELECT * FROM tesoreria_ordenes WHERE id_orden=$1',[orderId])).rows[0];
 assert.deepEqual({...finalOrder,id_factura:order.id_factura},order,'Paid order changed beyond its invoice reference');
 const finalInvoice=(await db.query("SELECT * FROM administracion_facturas_clientes WHERE id_factura_cliente='526116'")).rows[0];
 assert(finalInvoice.cobrada);assert.equal(Math.round(Number(finalInvoice.importe_cobrado)*100),189486);
 assert.equal((await db.query("SELECT count(*)::int n FROM tesoreria_ordenes WHERE id_factura='526116'")).rows[0].n,1);
 const finalReceipt=(await db.query('SELECT * FROM tesoreria_recibos_importados WHERE id_orden=$1',[orderId])).rows[0];
 assert.deepEqual({...finalReceipt,numero_recibo:receipt.numero_recibo,numero_factura:receipt.numero_factura},receipt);
 assert.deepEqual((await db.query('SELECT to_jsonb(t) row FROM tesoreria_movimientos_bancarios t ORDER BY id_linea_banco')).rows,bank);
 assert.deepEqual((await db.query('SELECT to_jsonb(t) row FROM tesoreria_aplicaciones_cobro t ORDER BY id_linea_banco,id_orden')).rows,applications);
 assert.deepEqual((await db.query("SELECT id_documento,sha256,octet_length(contenido) bytes FROM administracion_facturas_documentos WHERE id_factura_cliente='526116'")).rows,documents);
 const deleted=new Set(['tesoreria_ordenes','administracion_facturas_clientes','administracion_lineas_factura','tesoreria_recibos_importados']);
 for(const table of tables)assert.equal((await db.query(`SELECT count(*)::int n FROM ${q(table)}`)).rows[0].n,counts[table]-(deleted.has(table)?1:0)+(table==='general_identificadores_alias'?3:0),table);
 await db.query('COMMIT');
 const result={invoice:'526116',order:orderId,amount:1894.86,paid:true,reviewed:true,remesa:finalReceipt.id_remesa,receipt:finalReceipt.numero_recibo,backup};
 await fs.writeFile(folder+'/mecal-unification-result.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result));
}catch(error){try{await db.query('ROLLBACK');}catch{}throw error;}finally{db.release(true);await pool.end();}
