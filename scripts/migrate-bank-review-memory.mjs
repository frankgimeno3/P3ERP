import fs from 'node:fs';
import env from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';

env.loadEnvConfig(process.cwd());
const pool = getPgPool(), db = await pool.connect();
try {
  if (process.argv.includes('--apply')) {
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout='3s'");
    await db.query("SET LOCAL statement_timeout='30s'");
    await db.query(fs.readFileSync('database/migrations/20260920_0001_bank_review_memory.sql','utf8'));
    await db.query('COMMIT');
    console.log('Memoria bancaria instalada. No se han modificado movimientos ni cargos existentes.');
  } else {
    const { rows } = await db.query(`SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema=current_schema() AND table_name IN ('tesoreria_movimientos_bancarios','tesoreria_cargos_recurrentes','tesoreria_revision_decisiones','tesoreria_cargos_vencimientos','tesoreria_vencimientos_aplicaciones','tesoreria_revision_criterios') ORDER BY table_name,ordinal_position`);
    console.log(JSON.stringify(rows));
  }
} catch (e) { await db.query('ROLLBACK'); throw e; }
finally { db.release(); await pool.end(); }
