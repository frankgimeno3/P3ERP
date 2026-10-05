import env from '@next/env';
env.loadEnvConfig(process.cwd());
const {getPgPool}=await import('../server/database/pgClient.js');
const p=getPgPool();
try{console.log('ROLES',JSON.stringify((await p.query('SELECT id_rol,nombre_rol,permisos_rol,estado_rol FROM agentes_roles')).rows));console.log('EXISTING',JSON.stringify((await p.query("SELECT id_agente,nombre_completo_agente,rol_agente,estado_agente FROM agentes_db WHERE lower(email_agente)='contravidrioperfil@gmail.com'")).rows));}finally{await p.end();}
