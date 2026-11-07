import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {getAgentes} from '../server/features/agente/AgenteRepository.js';
import {getRoleById} from '../server/features/role/RoleRepository.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),schema='test_role_merge_'+randomUUID().replaceAll('-',''),query=pool.query;
try{
 await db.query('CREATE SCHEMA '+schema);await db.query('SET search_path TO '+schema+',public');
 for(const table of ['agentes_db','agentes_roles'])await db.query('CREATE TABLE '+schema+'.'+table+' (LIKE public.'+table+' INCLUDING ALL)');
 await db.query('SELECT public.p3_install_user_event_triggers()');
 await db.query(`INSERT INTO agentes_roles(id_rol,nombre_rol,permisos_rol,array_accesos_adicionales,accesos_personalizados) VALUES
 ('base','Base','["/base","/compartido"]','["/extra-base"]',false),('comercial','Comercial','["/comercial","/compartido"]','["/extra-comercial"]',true),('administracion','Administración','["/admin"]','[]',false)`);
 await db.query("INSERT INTO agentes_db(id_agente,rol_agente,estado_agente) VALUES('old','comercial','inactivo'),('current','base','activo'),('admin','administracion','activo')");
 const migration=readFileSync('database/migrations/20261107_0004_merge_base_commercial.sql','utf8');
 await db.query(migration);
 const snapshot=async()=>(await db.query("SELECT id_rol,nombre_rol,permisos_rol,array_accesos_adicionales,accesos_personalizados FROM agentes_roles ORDER BY id_rol")).rows;
 const first=await snapshot(),base=first.find(row=>row.id_rol==='base');
 assert(!first.some(row=>row.id_rol==='comercial'));assert.deepEqual(base.permisos_rol,['/base','/comercial','/compartido']);assert.deepEqual(base.array_accesos_adicionales,['/extra-base','/extra-comercial']);assert(base.accesos_personalizados);
 assert.deepEqual((await db.query("SELECT rol_agente,estado_agente FROM agentes_db WHERE id_agente='old'")).rows[0],{rol_agente:'base',estado_agente:'inactivo'});assert.equal((await db.query("SELECT rol_agente FROM agentes_db WHERE id_agente='admin'")).rows[0].rol_agente,'administracion');
 await db.query(migration);assert.deepEqual(await snapshot(),first);
 await db.query("UPDATE agentes_db SET rol_agente='COMERCIAL' WHERE id_agente='current'");assert.equal((await db.query("SELECT rol_agente FROM agentes_db WHERE id_agente='current'")).rows[0].rol_agente,'base');
 await db.query(readFileSync('database/migrations/20261107_0005_agent_departure.sql','utf8'));
 await db.query("UPDATE agentes_db SET fecha_baja='2026-11-05',motivo_baja='Prueba de fecha' WHERE id_agente='old'");
 pool.query=(...args)=>db.query(...args);
 assert.equal((await getAgentes({includeDeparture:true})).find(row=>row.id_agente==='old').fecha_baja,'2026-11-05');assert(!Object.hasOwn((await getAgentes()).find(row=>row.id_agente==='old'),'motivo_baja'));assert.equal((await getRoleById('comercial')).id_rol,'base');
 console.log('PASS: unión de permisos y accesos, migración sin reactivar agentes, otros roles intactos, idempotencia, escrituras antiguas canonicalizadas y fecha de baja conservada.');
}finally{pool.query=query;await db.query('RESET search_path');await db.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');db.release();await pool.end();}
