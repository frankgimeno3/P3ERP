import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {withUserEventContext} from '../server/features/userEvents/EventContext.js';
env.loadEnvConfig(process.cwd());const pool=getPgPool();
try {
 const actorId=process.argv.find(a=>a.startsWith('--actor='))?.slice(8);
 const actor=(await pool.query("SELECT id_agente,nombre_completo_agente FROM agentes_db WHERE id_agente=$1 AND rol_agente IN ('direccion','superadmin') AND estado_agente='activo'",[actorId])).rows[0];
 if(!actor)throw Error('Indica --actor=<agente Dirección/Superadmin>.');
 await withUserEventContext({actorId,actorName:actor.nombre_completo_agente,requestId:randomUUID(),route:'/mantenimiento/codex/produccion/numeros-revista',method:'POST',enabled:true,ip:null,ipSource:'codex_solicitud_usuario'},async()=>{
  const db=await pool.connect();try{
   await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");await db.query("SET LOCAL statement_timeout='60s'");
   const before=(await db.query('SELECT (SELECT count(*) FROM produccion_contenidos) contenidos,(SELECT count(*) FROM servicios_publicaciones) publicaciones,(SELECT count(*) FROM produccion_materiales) materiales')).rows[0];
   await db.query(await fs.readFile(new URL('../database/migrations/20261106_0002_unified_magazine_issues.sql',import.meta.url),'utf8'));
   const after=(await db.query('SELECT (SELECT count(*) FROM produccion_contenidos) contenidos,(SELECT count(*) FROM servicios_publicaciones) publicaciones,(SELECT count(*) FROM produccion_materiales) materiales')).rows[0];
   if(JSON.stringify(before)!==JSON.stringify(after))throw Error('La unificación no puede alterar el número de contenidos, publicaciones históricas ni materiales.');
   const summary=(await db.query("SELECT count(*) FILTER(WHERE id_numero_revista IS NULL) numeros,count(*) FILTER(WHERE id_numero_revista IS NOT NULL) alias FROM servicios_revistas")).rows[0];
   const dry=process.argv.includes('--dry-run');await db.query(dry?'ROLLBACK':'COMMIT');console.log(JSON.stringify({applied:!dry,...summary,conserved:after}));
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
 });
}finally{await pool.end();}
