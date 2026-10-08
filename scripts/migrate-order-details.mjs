import { readLegacyMigrationSql } from './readLegacyMigrationSql.mjs';

import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
try {
  await db.query('BEGIN');
  await db.query("SET LOCAL lock_timeout='3s'");
  await db.query(readLegacyMigrationSql('database/migrations/20260916_0001_order_details_cancellation.sql'));
  await db.query('COMMIT');
  console.log('Order details/cancellation columns ready. No orders cancelled.');
} catch(error) {await db.query('ROLLBACK');throw error;}
finally {db.release();await pool.end();}
