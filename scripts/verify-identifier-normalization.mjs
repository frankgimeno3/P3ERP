// Read-only verification of the committed normalization and its financial backup.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {resolveIdentifier} from '../server/features/identifiers/IdentifierAliases.js';
env.loadEnvConfig(process.cwd());
const folder='C:/Users/frank/Downloads/p3erp-identificadores-20261009';
const result=JSON.parse(await fs.readFile(folder+'/normalization-result.json','utf8'));
const before=JSON.parse(await fs.readFile(result.backup,'utf8'));
const pool=getPgPool(),db=await pool.connect();
try {
 await db.query('BEGIN READ ONLY');
 await db.query("SET LOCAL statement_timeout='30s'");
 const orders=(await db.query('SELECT id_orden,cobro_total,base_imponible,cobrada,cancelada,cobro_revision_bancaria,fecha_real_cobro FROM tesoreria_ordenes')).rows.map(o=>({...o,id_orden:result.changes.find(c=>c.entity==='orden'&&c.new===o.id_orden)?.old||o.id_orden})).sort((a,b)=>a.id_orden.localeCompare(b.id_orden));
 const invoices=(await db.query('SELECT numero_factura,importe_total,base_imponible,estado,ya_contabilizada FROM administracion_facturas_clientes ORDER BY numero_factura')).rows;
 const bank=(await db.query('SELECT id_linea_banco,importe,estado_revision,fecha_operativa FROM tesoreria_movimientos_bancarios ORDER BY id_linea_banco')).rows;
 assert.deepEqual({orders,invoices,bank},before.financial,'Financial data changed after the normalization');
 for(const t of before.counts)assert.equal((await db.query(`SELECT count(*)::int n FROM "${t.table}"`)).rows[0].n,t.n,t.table);
 let historicalUrls=0,reassignedCodes=0;
 for(const c of result.changes){
  assert.equal((await db.query(`SELECT count(*)::int n FROM "${c.table}" WHERE "${c.column}"=$1`,[c.new])).rows[0].n,1,c.new);
  const alias=(await db.query('SELECT id_actual FROM general_identificadores_alias WHERE entidad=$1 AND id_anterior=$2',[c.entity,c.old])).rows[0];
  assert.equal(alias?.id_actual,c.new,c.old);
  const reassigned=(await db.query(`SELECT 1 FROM "${c.table}" WHERE "${c.column}"=$1`,[c.old])).rowCount>0;
  assert.equal(await resolveIdentifier(c.entity,c.old,db),reassigned?c.old:c.new);
  if(reassigned)reassignedCodes++;else historicalUrls++;
 }
 const invalidForeignKeys=(await db.query("SELECT conname FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype='f' AND NOT convalidated")).rows;
 assert.equal(invalidForeignKeys.length,0,'Unvalidated foreign keys');
 const disabledTriggers=(await db.query("SELECT tgrelid::regclass::text table_name,tgname FROM pg_trigger WHERE NOT tgisinternal AND tgenabled='D' AND tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace)")).rows;
 assert.equal(disabledTriggers.length,0,'Disabled application triggers');
 await db.query('ROLLBACK');
 const verification={checkedAt:new Date().toISOString(),identifiers:result.changes.length,historicalUrls,reassignedCodes,financialDataUnchanged:true,rowCountsUnchanged:true,foreignKeysValidated:true,applicationTriggersEnabled:true};
 await fs.writeFile(folder+'/verification.json',JSON.stringify(verification,null,2));
 console.log(JSON.stringify(verification));
}finally{try{await db.query('ROLLBACK');}catch{}db.release();await pool.end();}
