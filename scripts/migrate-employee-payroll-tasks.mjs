import fs from 'node:fs';
import env from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
try {
  await db.query('BEGIN');
  await db.query("SET LOCAL lock_timeout='3s'");
  await db.query("SET LOCAL statement_timeout='30s'");
  await db.query(fs.readFileSync('database/migrations/20260911_0002_employee_payroll_tasks.sql','utf8'));
  await db.query(fs.readFileSync('database/migrations/20260911_0003_payroll_history_identity.sql','utf8'));
  await db.query('COMMIT');
  const result=await db.query(`SELECT (SELECT count(*)::int FROM nominas_empleados) AS fichas_nomina,
    (SELECT count(*)::int FROM cargos_recurrentes WHERE tipo_cargo='nomina') AS cargos_nomina,
    (SELECT count(*)::int FROM agentes_tareas) AS tareas`);
  console.log('Employee payroll/tasks migration applied:',result.rows[0]);
}catch(e){await db.query('ROLLBACK');console.error('Migration rolled back:',e.code||e.name);process.exitCode=1;}
finally{db.release();await pool.end();}
