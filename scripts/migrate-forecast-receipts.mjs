import fs from 'node:fs';
import env from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';

env.loadEnvConfig(process.cwd());
const pool = getPgPool();
const db = await pool.connect();
try {
  await db.query('BEGIN');
  await db.query("SET LOCAL lock_timeout='3s'");
  await db.query(fs.readFileSync('database/migrations/20260914_0001_forecast_receipt_import.sql', 'utf8'));
  await db.query('COMMIT');
  console.log('Forecast receipt import migration applied.');
} catch (error) {
  await db.query('ROLLBACK');
  console.error(error.code || error.name);
  process.exitCode = 1;
} finally { db.release(); await pool.end(); }
