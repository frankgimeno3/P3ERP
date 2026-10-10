// Recover receipt numbers from their real associated orders, without inventing invoices.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {renameIdentifiers} from '../server/features/identifiers/IdentifierNormalization.js';
env.loadEnvConfig(process.cwd());
const folder='C:/Users/frank/Downloads/p3erp-identificadores-20261009';
const pool=getPgPool(),db=await pool.connect();
try{
 await db.query('BEGIN');
 await db.query("SET LOCAL lock_timeout='5s'");
 await db.query("SET LOCAL statement_timeout='30s'");
 if(!(await db.query("SELECT pg_try_advisory_xact_lock(hashtext('ingresos:conciliacion')) locked")).rows[0].locked)throw Error('Hay otra operación de ingresos activa.');
 const rows=(await db.query("SELECT r.* FROM tesoreria_recibos_importados r JOIN tesoreria_ordenes o USING(id_orden) WHERE r.numero_recibo LIKE 'prev_excel_%' AND o.id_factura IS NULL AND o.id_contrato IS NOT NULL")).rows;
 const changes=rows.map(r=>({entity:'recibo',table:'tesoreria_recibos_importados',column:'numero_recibo',old:r.numero_recibo,new:r.id_orden+'-'+String(r.numero_cobro).padStart(3,'0'),reason:'Recibo sin factura: referencia de la orden real en lugar de un identificador artificial.'}));
 const backup=folder+'/before-receipt-normalization-'+Date.now()+'.json';
 const updated=await renameIdentifiers(db,changes,data=>fs.writeFile(backup,JSON.stringify({changes,rows:data},null,2),{flag:'wx'}));
 for(const r of rows){
  const current=(await db.query('SELECT * FROM tesoreria_recibos_importados WHERE numero_recibo=$1',[changes.find(c=>c.old===r.numero_recibo).new])).rows[0];
  assert.deepEqual({...current,numero_recibo:r.numero_recibo},r,'Receipt data changed beyond its identifier');
 }
 await db.query('COMMIT');
 await fs.writeFile(folder+'/receipt-normalization-result.json',JSON.stringify({changes,backup,updated},null,2));
 console.log(JSON.stringify({applied:changes.length,changes}));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
