// Preview: node --experimental-default-type=module scripts/unificar-proveedores.mjs
// Apply:   node --experimental-default-type=module scripts/unificar-proveedores.mjs --apply
import fs from 'node:fs';
import nextEnv from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';
import { supplierMergePlan, mergeSuppliers } from '../server/features/proveedor/SupplierMerge.js';

nextEnv.loadEnvConfig(process.cwd());
const pool = getPgPool(), client = await pool.connect();
const onlyNames = process.argv.includes('--requested') ? ['ADOBE','AMAZON BUSINESS','BANCO SABADELL','BITAVIS SERVEIS INFORMATICS','CORREOS','ENDESA','LINKEDIN','MOEVE','PIXUP','VERISURE','THALASSA','STARRESA'] : null;
try {
  if (!process.argv.includes('--apply')) {
    const { rows } = await client.query('SELECT * FROM proveedores_db');
    console.log(JSON.stringify(supplierMergePlan(rows).filter(g => !onlyNames || onlyNames.includes(g.name)).map(g => ({ proveedor:g.name, conservar:g.target.id_proveedor, unificar:g.sources.map(s => s.nombre_proveedor) })),null,2));
  } else {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query("SET LOCAL statement_timeout='30s'");
    await client.query(fs.readFileSync('database/migrations/20260905_0003_proveedores_tickets_tarjetas.sql','utf8'));
    const result = await mergeSuppliers(client, onlyNames);
    if (!onlyNames) await client.query(fs.readFileSync('database/migrations/20260905_0004_proveedores_nombre_unico.sql','utf8'));
    await client.query('COMMIT');
    console.log(JSON.stringify(result,null,2));
    console.log(`Unificados ${result.reduce((sum,row) => sum + row.eliminados,0)} registros duplicados. Referencias y originales archivados en RDS.`);
  }
} catch (error) { await client.query('ROLLBACK'); console.error(error.code || error.name, error.message); process.exitCode=1; }
finally { client.release(); await pool.end(); }
