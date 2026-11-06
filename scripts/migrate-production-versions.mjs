import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {withUserEventContext} from '../server/features/userEvents/EventContext.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool();
try {
 const actorId=process.argv.find(value=>value.startsWith('--actor='))?.slice(8);
 const actor=(await pool.query("SELECT id_agente,nombre_completo_agente FROM agentes_db WHERE id_agente=$1 AND estado_agente='activo' AND rol_agente IN ('direccion','superadmin')",[actorId])).rows[0];
 if (!actor) throw new Error('Indica --actor=<agente Dirección/Superadmin> para la migración autorizada.');
 await withUserEventContext({actorId,actorName:actor.nombre_completo_agente,requestId:randomUUID(),route:'/mantenimiento/codex/produccion/versiones',method:'POST',enabled:true,ip:null,ipSource:'codex_solicitud_usuario'},async()=>{
  const db=await pool.connect();
  try {
   await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");await db.query("SET LOCAL statement_timeout='30s'");
   await db.query(await fs.readFile(new URL('../database/migrations/20261106_0001_production_finished_versions.sql',import.meta.url),'utf8'));
   await db.query('COMMIT');console.log('Aplicada migración de versiones acabadas; auditoría instalada.');
  } catch(error) {await db.query('ROLLBACK');throw error;} finally {db.release();}
 });
} finally {await pool.end();}
