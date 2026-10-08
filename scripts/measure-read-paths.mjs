import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {getPropuestas} from '../server/features/propuesta/PropuestaRepository.js';
import {getRevistas} from '../server/features/revista/RevistaRepository.js';
import {getNewsletters} from '../server/features/revista/NewsletterRepository.js';

// Repository measurements only: no HTTP, writes, query parameters or customer data in the report.
env.loadEnvConfig(process.cwd());
const pool = getPgPool(), db = await pool.connect();
const originalQuery = pool.query;
const results = [];
let queries = [];
try {
  await db.query('BEGIN READ ONLY');
  await db.query("SET LOCAL statement_timeout = '30s'");
  pool.query = async (...args) => {
    const start = performance.now();
    const result = await db.query(...args);
    queries.push({ms:Number((performance.now()-start).toFixed(2)),rows:result.rowCount});
    return result;
  };
  for (const [name,read] of [['propuestas',getPropuestas],['revistas',getRevistas],['newsletters',getNewsletters]]) {
    for (let run = 1; run <= 3; run++) {
      queries = [];
      const start = performance.now(), data = await read();
      results.push({name,run,ms:Number((performance.now()-start).toFixed(2)),
        rows:Array.isArray(data)?data.length:null,bytes:Buffer.byteLength(JSON.stringify(data)),queries});
    }
  }
  const report = {at:new Date().toISOString(),scope:'Repository read-only transaction; excludes HTTP and browser rendering',results};
  const target = path.join(process.env.P3_TEST_REPORT_DIR||path.join(os.tmpdir(),'p3erp-tests'),'read-paths.json');
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));console.log('Report: '+target);
} finally {
  pool.query = originalQuery;
  await db.query('ROLLBACK');db.release();await pool.end();
}
