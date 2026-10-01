import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect();
try {
 await db.query('BEGIN');
 await db.query("SELECT pg_advisory_xact_lock(hashtext('agent:marketing@vidrioperfil.com'))");
 const existing=(await db.query("SELECT id_agente FROM agentes_db WHERE lower(email_agente)='marketing@vidrioperfil.com' FOR UPDATE")).rows;
 if(existing.length>1)throw Error('Existen varios agentes con el correo de Marketing.');
 let agentId=existing[0]?.id_agente;
 if(!agentId){agentId='ag_marketing_vidrioperfil';await db.query("INSERT INTO agentes_db(id_agente,nombre_agente,apellidos_agente,nombre_completo_agente,email_agente,rol_agente,estado_agente,is_empleado_account) VALUES($1,'Marketing','','Marketing','marketing@vidrioperfil.com','base','activo',false)",[agentId]);}
 else await db.query('UPDATE agentes_db SET is_empleado_account=false,updated_at=now() WHERE id_agente=$1',[agentId]);
 await db.query('COMMIT');console.log(JSON.stringify({id_agente:agentId,email:'marketing@vidrioperfil.com',is_empleado_account:false}));
}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();await pool.end();}
