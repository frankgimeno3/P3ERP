import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {withUserEventContext} from '../server/features/userEvents/EventContext.js';
import {addProductionMaterial} from '../server/features/produccion/GestionesProduccionRepository.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),requestId=randomUUID();
const id='PRUEBA-version-'+randomUUID(),schema='test_versions_'+randomUUID().replaceAll('-','');
const originalConnect=pool.connect.bind(pool),clients=[];
const file=(content,finished=true)=>{const mediaId=randomUUID();return {id_contenido:content,tipo:'articulos',es_version_acabada:finished,mediaId,s3Key:`mediateca/documentos_produccion/material_articulos/${mediaId}/test.pdf`,nombre_material:'Version test',contentType:'application/pdf'};};
try {
 await withUserEventContext({actorId:'test-versiones',actorName:'Prueba transaccional',requestId,route:'/test/produccion/versiones',method:'POST',enabled:true,ip:null,ipSource:'prueba'},async()=>{
  await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");
  await db.query("INSERT INTO produccion_contenidos(id_contenido,nombre_contenido,tipo_contenido,hoja_prod,es_prueba) VALUES($1,'Prueba versiones','articulo',true,true)",[id]);
  const raw=await addProductionMaterial(file(id,false),async()=>{},db);assert.equal(raw.es_version_acabada,false);assert.equal(raw.numero_version,null);
  const firstFile=file(id),first=await addProductionMaterial(firstFile,async()=>{},db);
  const retry=await addProductionMaterial(firstFile,async()=>{throw Error('No debe repetir la subida');},db);assert.equal(retry.id_material,first.id_material);
  const second=await addProductionMaterial(file(id),async()=>{},db);assert.equal(first.numero_version,1);assert.equal(second.numero_version,2);
  const count=(await db.query('SELECT count(*)::int n FROM produccion_materiales WHERE id_contenido=$1',[id])).rows[0].n;
  await assert.rejects(addProductionMaterial(file(id),async()=>{throw Error('Fallo S3');},db),/Fallo S3/);
  assert.equal((await db.query('SELECT count(*)::int n FROM produccion_materiales WHERE id_contenido=$1',[id])).rows[0].n,count);
  await db.query('SAVEPOINT version_constraint');
  await assert.rejects(db.query('UPDATE produccion_materiales SET numero_version=NULL WHERE id_material=$1',[first.id_material]),e=>e.code==='23514');await db.query('ROLLBACK TO SAVEPOINT version_constraint');
  await db.query('SAVEPOINT version_duplicate');
  await assert.rejects(db.query('UPDATE produccion_materiales SET numero_version=1 WHERE id_material=$1',[second.id_material]),e=>e.code==='23505');await db.query('ROLLBACK TO SAVEPOINT version_duplicate');
  await db.query("UPDATE produccion_materiales SET comentarios='Revision transaccional' WHERE id_material=$1",[first.id_material]);
  const events=(await db.query("SELECT tipo,datos_anteriores,datos_nuevos FROM eventos_de_usuarios WHERE id_solicitud=$1 AND tabla='produccion_materiales'",[requestId])).rows;
  assert(events.some(e=>e.tipo==='crear'&&e.datos_nuevos.es_version_acabada&&e.datos_nuevos.numero_version===1));
  assert(events.some(e=>e.tipo==='editar'&&e.datos_anteriores.comentarios===''&&e.datos_nuevos.comentarios==='Revision transaccional'));
  await db.query('DELETE FROM produccion_materiales WHERE id_material=$1',[second.id_material]);
  assert((await db.query("SELECT 1 FROM eventos_de_usuarios WHERE id_solicitud=$1 AND tabla='produccion_materiales' AND tipo='borrar' AND datos_anteriores->>'id_material'=$2",[requestId,second.id_material])).rowCount);
  await db.query('ROLLBACK');
 });
 assert.equal((await db.query('SELECT 1 FROM produccion_contenidos WHERE id_contenido=$1',[id])).rowCount,0);
 assert.equal((await db.query('SELECT 1 FROM eventos_de_usuarios WHERE id_solicitud=$1',[requestId])).rowCount,0);
 // Dos transacciones reales aisladas en un esquema efímero, sin objetos S3.
 await db.query('CREATE SCHEMA '+schema);await db.query('SET search_path TO '+schema+',public');
 for(const table of ['produccion_contenidos','produccion_materiales','mediateca_carpetas','mediateca_archivos','produccion_revistas_contenidos'])await db.query(`CREATE TABLE ${schema}.${table} (LIKE public.${table} INCLUDING ALL)`);
 await db.query("INSERT INTO produccion_contenidos(id_contenido,tipo_contenido,hoja_prod) VALUES('parallel','articulo',true)");
 for(let i=0;i<2;i++){const c=await originalConnect();await c.query('SET search_path TO '+schema+',public');await c.query("SET lock_timeout='5s'");clients.push(c);}
 const available=[...clients];pool.connect=async()=>{const c=available.shift();assert(c);return {query:(...args)=>c.query(...args),release(){}};};
 const result=await Promise.all([addProductionMaterial(file('parallel'),async()=>{}),addProductionMaterial(file('parallel'),async()=>{})]);
 assert.deepEqual(result.map(r=>r.numero_version).sort(),[1,2]);assert.notEqual(result[0].mediateca_id,result[1].mediateca_id);
 assert.equal((await db.query('SELECT count(*)::int n FROM produccion_materiales')).rows[0].n,2);
 console.log('PASS: materiales ordinarios, V01/V02, reintento idempotente, auditoria antes/despues/borrado, rollback y dos versiones concurrentes sin sobrescritura.');
}finally{
 pool.connect=originalConnect;
 for(const c of clients){await c.query('RESET search_path');await c.query('RESET lock_timeout');c.release();}
 await db.query('ROLLBACK');await db.query('SET search_path TO public');await db.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');db.release();await pool.end();
}
