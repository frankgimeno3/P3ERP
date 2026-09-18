// Run: node --experimental-default-type=module scripts/snapshot-laboral.mjs
import fs from 'node:fs';
import nextEnv from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';

nextEnv.loadEnvConfig(process.cwd());
const pool = getPgPool();
const tables = ['agentes_db','laboral_anticipos','laboral_nominas','laboral_calendarios','laboral_eventos_calendario','laboral_dias_libre_disposicion','laboral_ausencias','laboral_comentarios_empleados','laboral_procesos_seleccion','laboral_candidatos','laboral_documentos'];
let snapshot = fs.readFileSync('database/schema.md','utf8');
const cell = value => String(value ?? '').replaceAll('|','\\|');
try {
  for (const table of tables) {
    const [columns,constraints,indexes] = await Promise.all([
      pool.query(`SELECT a.attnum AS ordinal,a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,CASE WHEN a.attnotnull THEN 'NO' ELSE 'YES' END AS nullable,pg_get_expr(d.adbin,d.adrelid) AS default_value FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relname=$1 AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum`,[table]),
      pool.query(`SELECT conname,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND t.relname=$1 ORDER BY conname`,[table]),
      pool.query("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=$1 ORDER BY indexname",[table]),
    ]);
    if (!columns.rowCount) throw new Error(`Missing table: ${table}`);
    let section = `### ${table}\n\n| # | Column | Type | Nullable | Default |\n|---:|---|---|---|---|\n`;
    section += columns.rows.map(c => `| ${c.ordinal} | ${cell(c.name)} | ${cell(c.type)} | ${c.nullable} | ${cell(c.default_value)} |`).join('\n');
    section += '\n\nConstraints:\n' + constraints.rows.map(c => `- ${c.conname}: ${c.definition}`).join('\n');
    section += '\n\nIndexes:\n' + indexes.rows.map(i => `- ${i.indexname}: ${i.indexdef}`).join('\n') + '\n\n';
    const start = snapshot.indexOf(`### ${table}\n`) >= 0 ? snapshot.indexOf(`### ${table}\n`) : snapshot.indexOf(`### ${table}\r\n`);
    if (start < 0) snapshot = snapshot.trimEnd() + '\n\n' + section;
    else { const end = snapshot.indexOf('\n### ',start + 4); snapshot = snapshot.slice(0,start) + section + (end < 0 ? '' : snapshot.slice(end + 1)); }
  }
  fs.writeFileSync('database/schema.md',snapshot);
  console.log(`Esquema actualizado desde RDS: ${tables.length} tablas.`);
} finally { await pool.end(); }
