import env from '@next/env';
import dns from 'node:dns/promises';
import {getPgPool} from '../server/database/pgClient.js';

env.loadEnvConfig(process.cwd());
const host = process.env.DATABASE_HOST || '';
console.log(JSON.stringify({configured: Boolean(host), hasWhitespace: /\s/.test(host), hasProtocol: host.includes('://'), hasQuotes: /["']/.test(host), portValid: Number.isInteger(Number(process.env.DATABASE_PORT)) && Number(process.env.DATABASE_PORT)>0}));
try {
  await dns.lookup(host);
  console.log('Database hostname resolves.');
  const pool = getPgPool();
  try {
    const result = await pool.query('SELECT EXISTS (SELECT 1 FROM agentes_db) AS agents_available');
    console.log(JSON.stringify({databaseAccessible:true,agentsAvailable:result.rows[0]?.agents_available}));
    // Endpoint only; never print authentication credentials.
    console.log(JSON.stringify({verifiedDatabaseHost:host}));
  } finally {await pool.end();}
} catch (error) {
  console.error(JSON.stringify({name:error.name,code:error.code}));
  process.exitCode=1;
}
