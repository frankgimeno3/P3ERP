import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {getContactos} from '../server/features/contacto/ContactoRepository.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),schema='test_contact_sort_'+randomUUID().replaceAll('-',''),original=pool.query;
try{
 await db.query('CREATE SCHEMA '+schema);await db.query('SET search_path TO '+schema+',public');
 for(const table of ['comercial_contactos','comercial_cuentas'])await db.query('CREATE TABLE '+schema+'.'+table+' (LIKE public.'+table+' INCLUDING ALL)');
 pool.query=(...args)=>db.query(...args);
 for(let i=24;i>=1;i--)await db.query('INSERT INTO comercial_contactos(id_contacto,nombre_contacto,nombre_completo_contacto,email_contacto,nombre_empresa) VALUES($1,$2,$2,$3,$4)',[`contact_${String(i).padStart(2,'0')}`,`Nombre ${String(i).padStart(2,'0')}`,`test${i}@example.com`,`Empresa ${String(25-i).padStart(2,'0')}`]);
 const first=await getContactos({sortBy:'nombre_contacto',sortDirection:'asc',limit:10,page:1});
 const next=await getContactos({sortBy:'nombre_contacto',sortDirection:'asc',limit:10,page:2});
 assert.equal(first.total,24);assert.equal(first.rows[0].id_contacto,'contact_01');assert.equal(next.rows[0].id_contacto,'contact_11');
 const descending=await getContactos({sortBy:'nombre_contacto',sortDirection:'desc',limit:10,page:1});assert.equal(descending.rows[0].id_contacto,'contact_24');
 const company=await getContactos({sortBy:'nombre_empresa',sortDirection:'asc',limit:10,page:1});assert.equal(company.rows[0].id_contacto,'contact_24');
 assert.equal((await getContactos({sortBy:'nombre_contacto; DROP TABLE comercial_contactos',sortDirection:'desc',limit:10,page:1})).rows[0].id_contacto,'contact_01');
 assert.equal((await getContactos({sortBy:'nombre_contacto',sortDirection:'desc; DROP TABLE comercial_contactos',limit:10,page:1})).rows[0].id_contacto,'contact_01');
 console.log('PASS: contact sorting before pagination, all results, reverse order, company column and SQL allowlist in isolated database schema.');
}finally{pool.query=original;await db.query('RESET search_path');await db.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');db.release();await pool.end();}
