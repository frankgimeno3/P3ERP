import fs from 'node:fs';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
if(!process.argv.includes('--apply')){
  console.log('Prepared migration: database/migrations/20260929_0001_tarjetas_liquidaciones.sql. Use --apply to execute it.');
}else{
  env.loadEnvConfig(process.cwd());
  const pool=getPgPool(),db=await pool.connect();
  try{
    await db.query("SET lock_timeout='3s'");
    await db.query("SET statement_timeout='60s'");
    await db.query(fs.readFileSync('database/migrations/20260929_0001_tarjetas_liquidaciones.sql','utf8'));
    console.log('Card settlement migration applied.');
  }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await pool.end();}
}
