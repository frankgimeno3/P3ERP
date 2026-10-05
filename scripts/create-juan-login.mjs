import env from '@next/env';
import {randomUUID} from 'node:crypto';
env.loadEnvConfig(process.cwd());
const {getPgPool}=await import('../server/database/pgClient.js');
const {cognitoUserExists,createConfirmedUser,confirmExistingUser}=await import('../server/features/user/UserSerivce.js');
const pool=getPgPool(),email='contravidrioperfil@gmail.com',password=process.env.P3_JUAN_PASSWORD;
if(!password)throw Error('Falta la contraseña en memoria de ejecución.');
try {
 await pool.query("INSERT INTO agentes_roles(id_rol,nombre_rol,descripcion_rol,permisos_rol,estado_rol) VALUES('direccion','Dirección','Dirección sin permisos de superadmin','[\"/dashboard\",\"/dashboard/direccion\"]'::jsonb,'activo') ON CONFLICT(id_rol) DO NOTHING");
 const existing=(await pool.query('SELECT * FROM agentes_db WHERE lower(btrim(email_agente))=$1',[email])).rows;
 if(existing.length>1||existing[0]?.rol_agente==='superadmin')throw Error('Revisar cuenta existente antes de modificar sus permisos.');
 const cloud=await cognitoUserExists(email);
 const result=cloud?await confirmExistingUser('Juan',email,password,'direccion'):await createConfirmedUser('Juan',email,password,'direccion');
 if(existing.length)await pool.query("UPDATE agentes_db SET nombre_completo_agente='Juan',rol_agente='direccion',estado_agente='activo',is_empleado_account=FALSE,updated_at=now() WHERE id_agente=$1",[existing[0].id_agente]);
 else await pool.query("INSERT INTO agentes_db(id_agente,nombre_agente,nombre_completo_agente,email_agente,rol_agente,estado_agente,is_empleado_account) VALUES($1,'Juan','Juan',$2,'direccion','activo',FALSE)",['ag_'+randomUUID().replaceAll('-','').slice(0,20),email]);
 console.log(JSON.stringify({email,role:'direccion',superadmin:false,active:true,cognitoCreated:!cloud,groupAssigned:result.groupAssigned}));
}finally{await pool.end();}
