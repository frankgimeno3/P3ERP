import { readLegacyMigrationSql } from './readLegacyMigrationSql.mjs';
import fs from 'node:fs';
import nextEnv from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';

nextEnv.loadEnvConfig(process.cwd());
const pool = getPgPool(), client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout = '5s'");
  await client.query("SET LOCAL statement_timeout = '30s'");
  await client.query(readLegacyMigrationSql('database/migrations/20260907_0001_payroll_recurring_charges.sql'));
  await client.query('COMMIT');
  console.log('Payroll recurring charges migration applied.');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Migration rolled back:', error.code || error.name);
  process.exitCode = 1;
} finally { client.release(); await pool.end(); }
