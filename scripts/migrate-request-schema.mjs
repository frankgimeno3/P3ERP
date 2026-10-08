import fs from 'node:fs';
import assert from 'node:assert/strict';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';

// Preview rolls back. Applying refuses to change any existing business row.
env.loadEnvConfig(process.cwd());
const tables = ['servicios_revistas','servicios_publicaciones','servicios_paginas_revista','servicios_newsletters',
  'comercial_propuestas_db','comercial_propuestas_lineas','comercial_contratos','comercial_contratos_lineas','produccion_contenidos'];
const pool = getPgPool(), db = await pool.connect();
async function snapshot() {
  const result = {};
  for (const table of tables) {
    const exists = (await db.query('SELECT to_regclass($1) AS name',[table])).rows[0].name;
    result[table] = exists ? (await db.query(`SELECT count(*)::int AS rows,
      md5(coalesce(string_agg(row_hash, '' ORDER BY row_hash),'')) AS digest
      FROM (SELECT md5(to_jsonb(t)::text) AS row_hash FROM ${table} t) hashes`)).rows[0] : null;
  }
  return result;
}
try {
  await db.query('BEGIN');
  await db.query("SET LOCAL lock_timeout = '3s'");
  await db.query("SET LOCAL statement_timeout = '30s'");
  await db.query("SELECT pg_advisory_xact_lock(hashtext('explicit-publication-proposal-schema'))");
  const before = await snapshot();
  for (const file of ['20261008_0002_explicit_publication_proposal_schema.sql','20261008_0003_publication_backfill.sql']) {
    await db.query(fs.readFileSync(new URL('../database/migrations/'+file,import.meta.url),'utf8'));
  }
  const after = await snapshot();
  const changed = tables.filter(table => JSON.stringify(before[table]) !== JSON.stringify(after[table]));
  console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':'preview',changedTables:changed,
    rows:Object.fromEntries(tables.map(table=>[table,after[table]?.rows??0]))},null,2));
  if (process.argv.includes('--apply')) {
    assert.deepEqual(changed,[], 'La migración cambiaría datos. Se revierte; revisar el backfill por separado.');
    await db.query('COMMIT');
    console.log('Esquema verificado y migración aplicada sin modificar datos existentes.');
  } else {
    await db.query('ROLLBACK');
    console.log('Vista previa revertida.');
  }
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
} finally {
  db.release();
  await pool.end();
}
