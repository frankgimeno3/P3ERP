import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {parseJuanExcel,juanTotals,plannedJuanCells,JUAN_SOURCE} from '../server/features/prevision/JuanExcel.js';
env.loadEnvConfig(process.cwd());
const sourcePath=process.argv.slice(2).find(arg=>!arg.startsWith('--')) || path.join(os.homedir(),'OneDrive','Escritorio',JUAN_SOURCE);
const sheets=parseJuanExcel(fs.readFileSync(sourcePath));
console.log(JSON.stringify(sheets.map(sheet=>({bank:sheet.bank,planned:plannedJuanCells([sheet]).length,closing:juanTotals(sheet).balances.at(-1)/100,checks:juanTotals(sheet).differences.filter(x=>x!==null)}))));
if(process.argv.includes('--write')) {
  const pool=getPgPool(),db=await pool.connect();
  try {
    await db.query('BEGIN');
    await db.query(fs.readFileSync('database/migrations/20261003_0001_juan_liquidity.sql','utf8'));
    const result=await db.query(`INSERT INTO tesoreria_prevision_juan(id,source_name,sheets,original_sheets) VALUES('juan-2026',$1,$2::jsonb,$2::jsonb) ON CONFLICT(id) DO NOTHING`,[JUAN_SOURCE,JSON.stringify(sheets)]);
    await db.query('COMMIT');console.log(result.rowCount?'Importado: Juan 2026':'Ya importado; se conservan las ediciones.');
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
}
