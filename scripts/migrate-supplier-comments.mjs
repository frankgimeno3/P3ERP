import fs from 'node:fs';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
try{await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");await db.query(fs.readFileSync('database/migrations/20260912_0001_supplier_comments.sql','utf8'));await db.query('COMMIT');console.log('Supplier comments migration applied.');}
catch(e){await db.query('ROLLBACK');console.error(e.code||e.name);process.exitCode=1;}
finally{db.release();await pool.end();}
