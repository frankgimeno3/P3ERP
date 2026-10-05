import env from '@next/env';
import fs from 'node:fs';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
const names=['20261005_0002_invoice_payment_obligations.sql','20261005_0003_mediateca_trash.sql','20261005_0004_workflow_revisions.sql','20261005_0005_invoice_uploads.sql','20261005_0006_final_flatplan_assignments.sql'];
try{await db.query('BEGIN');for(const name of names){await db.query(fs.readFileSync(`database/migrations/${name}`,'utf8'));console.log(`Applied ${name}`);}await db.query('COMMIT');}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
