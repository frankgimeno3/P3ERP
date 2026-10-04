import assert from 'node:assert/strict';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool(),db=await pool.connect();
try{
 await db.query('BEGIN');
 await db.query('CREATE TEMP TABLE receipt_bank_test(id integer,forma_cobro text,banco_cobro text)');
 await db.query('CREATE TRIGGER receipt_default_bank BEFORE INSERT OR UPDATE OF forma_cobro,banco_cobro ON receipt_bank_test FOR EACH ROW EXECUTE FUNCTION p3_receipt_default_bank()');
 await db.query("INSERT INTO receipt_bank_test VALUES(1,'recibo',NULL),(2,'transferencia',NULL),(3,'recibo','Santander'),(4,'remesa',' ')");
 const rows=(await db.query('SELECT * FROM receipt_bank_test ORDER BY id')).rows;
 assert.equal(rows[0].banco_cobro,'Sabadell');assert.equal(rows[1].banco_cobro,null);assert.equal(rows[2].banco_cobro,'Santander');assert.equal(rows[3].banco_cobro,'Sabadell');
 await db.query("UPDATE receipt_bank_test SET banco_cobro='Santander' WHERE id=1");assert.equal((await db.query('SELECT banco_cobro FROM receipt_bank_test WHERE id=1')).rows[0].banco_cobro,'Santander');
 await db.query("UPDATE receipt_bank_test SET forma_cobro='recibo' WHERE id=2");assert.equal((await db.query('SELECT banco_cobro FROM receipt_bank_test WHERE id=2')).rows[0].banco_cobro,'Sabadell');
 console.log('PASS: automatic Sabadell for receipts, explicit later bank changes respected; transfers unchanged. Test data rolled back.');
}finally{await db.query('ROLLBACK');db.release();await pool.end();}
