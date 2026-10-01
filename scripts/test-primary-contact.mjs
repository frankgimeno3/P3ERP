import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {createContacto,getContactos,setContactoPrincipal,unlinkContactoFromCuenta} from '../server/features/contacto/ContactoRepository.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),schema='test_primary_'+randomUUID().replaceAll('-','');
const connect=pool.connect.bind(pool),query=pool.query.bind(pool);
try {
  await db.query('CREATE SCHEMA '+schema);await db.query('SET search_path TO '+schema+',public');
  for(const table of ['comercial_cuentas','comercial_contactos','general_eventos','cuentas_registro_eventos','comentarios_registro_eventos'])await db.query('CREATE TABLE '+schema+'.'+table+' (LIKE public.'+table+' INCLUDING ALL)');
  pool.connect=async()=>({query:(...args)=>db.query(...args),release(){}});pool.query=(...args)=>db.query(...args);
  await db.query("INSERT INTO comercial_cuentas(id_cuenta,nombre_empresa,datos_comerciales) VALUES('A','Cuenta A','{\"otro\":\"conservar\"}'),('B','Cuenta B','{}')");
  const first=await createContacto({id_cuenta:'A',nombre_contacto:'Primero',email_contacto:'uno@example.test'});
  const second=await createContacto({id_cuenta:'A',nombre_contacto:'Segundo',email_contacto:'dos@example.test'});
  let rows=await getContactos({idCuenta:'A'});assert.equal(rows.filter(row=>row.es_principal).length,1);assert(rows.find(row=>row.id_contacto===first.id_contacto).es_principal);
  await assert.rejects(setContactoPrincipal('B',first.id_contacto),/no pertenece/);
  await setContactoPrincipal('A',second.id_contacto,'actor');
  rows=await getContactos({idCuenta:'A'});assert.equal(rows.filter(row=>row.es_principal).length,1);assert(rows.find(row=>row.id_contacto===second.id_contacto).es_principal);
  assert.equal((await db.query("SELECT datos_comerciales FROM comercial_cuentas WHERE id_cuenta='A'")).rows[0].datos_comerciales.otro,'conservar');
  await unlinkContactoFromCuenta(second.id_contacto,'A');
  assert.equal((await db.query("SELECT datos_comerciales FROM comercial_cuentas WHERE id_cuenta='A'")).rows[0].datos_comerciales.contacto_principal,undefined);
  console.log('PASS: first contact becomes primary, later contacts preserve choice, explicit change, account ownership validation and existing account data preserved.');
}finally{pool.connect=connect;pool.query=query;await db.query('ROLLBACK');await db.query('SET search_path TO public');await db.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');db.release();await pool.end();}
