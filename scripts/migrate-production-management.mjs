import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import env from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';
import { withUserEventContext } from '../server/features/userEvents/EventContext.js';
import { flattenProductionMedia } from '../server/features/produccion/ProductionMediaFolders.js';

env.loadEnvConfig(process.cwd());
const pool = getPgPool();
try {
  const actorId = process.argv.find(a => a.startsWith('--actor='))?.slice(8);
  const actor = (await pool.query("SELECT id_agente,nombre_completo_agente FROM agentes_db WHERE id_agente=$1 AND rol_agente IN ('direccion','superadmin')", [actorId])).rows[0];
  if (!actor) throw new Error('Indica --actor=<agente Dirección/Superadmin> para la migración autorizada.');
  await withUserEventContext({ actorId, actorName: actor.nombre_completo_agente, requestId: randomUUID(), route: '/mantenimiento/codex/produccion/gestion', method: 'POST', enabled: true, ip: null, ipSource: 'codex_solicitud_usuario' }, async () => {
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      await db.query("SET LOCAL lock_timeout='3s'");
      await db.query("SET LOCAL statement_timeout='60s'");
      const folders = await flattenProductionMedia(db);
      if (!process.argv.includes('--folders-only')) await db.query(await fs.readFile(new URL('../database/migrations/20261105_0001_production_management.sql', import.meta.url), 'utf8'));
      await db.query('COMMIT');
      console.log(JSON.stringify({ applied: true, folders }));
    } catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  });
} finally { await pool.end(); }
