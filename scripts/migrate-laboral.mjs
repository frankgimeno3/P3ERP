import { readLegacyMigrationSql } from './readLegacyMigrationSql.mjs';
// Run: node --experimental-default-type=module scripts/migrate-laboral.mjs
import fs from 'node:fs';
import nextEnv from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';

nextEnv.loadEnvConfig(process.cwd());
const pool = getPgPool(), client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query("SET LOCAL lock_timeout = '5s'");
  await client.query("SET LOCAL statement_timeout = '30s'");
  await client.query(readLegacyMigrationSql('database/migrations/20260905_0001_laboral.sql'));
  await client.query(readLegacyMigrationSql('database/migrations/20260905_0002_laboral_documentos_rds.sql'));
  await client.query('COMMIT');
  console.log('Migración Laboral aplicada correctamente.');
} catch (error) {
  await client.query('ROLLBACK');
  console.error('Migración Laboral no aplicada:', error.code || error.name);
  process.exitCode = 1;
} finally { client.release(); await pool.end(); }
