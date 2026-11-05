import fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {withUserEventContext} from '../server/features/userEvents/EventContext.js';

env.loadEnvConfig(process.cwd());
const pool=getPgPool(),apply=process.argv.includes('--apply');
const actorId=process.argv.find(a=>a.startsWith('--actor='))?.slice(8);
try{
 if(apply){
  if(!actorId)throw Error('Indica --actor=<id_agente> para atribuir la migración autorizada.');
  const actor=(await pool.query('SELECT id_agente,nombre_completo_agente,rol_agente FROM agentes_db WHERE id_agente=$1',[actorId])).rows[0];
  if(!actor||!['superadmin','direccion'].includes(actor.rol_agente))throw Error('Se requiere un agente de Dirección o Superadmin.');
  const migrations=['20261103_0001_properties.sql','20261103_0002_property_parking_groups.sql'];
  await withUserEventContext({actorId,actorName:actor.nombre_completo_agente,requestId:randomUUID(),route:'/mantenimiento/codex/propiedades/migracion',method:'POST',enabled:true,ip:null,ipSource:'codex_rds_solicitud_usuario'},async()=>{
   const db=await pool.connect();
   try{
    await db.query('BEGIN');
    await db.query("SET LOCAL lock_timeout='3s'");
    await db.query("SET LOCAL statement_timeout='30s'");
    for(const file of migrations)await db.query(await fs.readFile(new URL('../database/migrations/'+file,import.meta.url),'utf8'));
    await db.query('COMMIT');
   }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  });
 }
 console.log(JSON.stringify({applied:apply,tables:(await pool.query(`SELECT c.relname tabla,t.tgname trigger_auditoria,t.tgenabled habilitado FROM pg_class c
  LEFT JOIN pg_trigger t ON t.tgrelid=c.oid AND t.tgname='p3_user_events_row'
  WHERE c.relnamespace='public'::regnamespace AND c.relname=ANY($1::text[]) ORDER BY c.relname`,[['direccion_propiedades','direccion_propiedades_cargos','direccion_propiedades_movimientos']])).rows}));
}finally{await pool.end();}
