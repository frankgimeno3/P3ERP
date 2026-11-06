import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {withUserEventContext} from '../server/features/userEvents/EventContext.js';
import {assignContentMagazine} from '../server/features/produccion/ProductionRepository.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),requestId=randomUUID(),id='PRUEBA-assignment-'+randomUUID(),schema='test_assignment_'+randomUUID().replaceAll('-','');
const originalConnect=pool.connect.bind(pool),clients=[];
try {
 const magazines=(await db.query('SELECT id_revista FROM servicios_revistas ORDER BY id_revista LIMIT 2')).rows;assert.equal(magazines.length,2);
 await withUserEventContext({actorId:'test-asignacion',actorName:'Prueba transaccional',requestId,route:'/test/produccion/asignacion',method:'POST',enabled:true,ip:null,ipSource:'prueba'},async()=>{
  await db.query('BEGIN');
  const content=(await db.query("INSERT INTO produccion_contenidos(id_contenido,nombre_contenido,tipo_contenido,tipo_revista_servicio,es_prueba,hoja_prod) VALUES($1,'Prueba asignacion','anuncio','Revista',true,true) RETURNING *",[id])).rows[0];
  await assert.rejects(assignContentMagazine(magazines[0].id_revista,{id_contenido:id,tipo:'anuncios'},db),e=>e.status===409);
  await assert.rejects(assignContentMagazine('missing',{id_contenido:id,tipo:'anuncios',expectedVersion:content.updated_at},db),e=>e.status===404);
  await assignContentMagazine(magazines[0].id_revista,{id_contenido:id,tipo:'anuncios',expectedVersion:content.updated_at},db);
  await assert.rejects(assignContentMagazine(magazines[1].id_revista,{id_contenido:id,tipo:'anuncios',expectedVersion:content.updated_at},db),e=>e.status===409);
  const updated=(await db.query('SELECT * FROM produccion_contenidos WHERE id_contenido=$1',[id])).rows[0];assert(updated.destino_revista);
  await assignContentMagazine(magazines[1].id_revista,{id_contenido:id,tipo:'anuncios',expectedVersion:updated.updated_at},db);
  const links=(await db.query('SELECT * FROM produccion_revistas_contenidos WHERE id_contenido=$1',[id])).rows;assert.equal(links.length,2);
  const events=(await db.query('SELECT tabla,tipo,datos_anteriores,datos_nuevos FROM eventos_de_usuarios WHERE id_solicitud=$1',[requestId])).rows;
  assert(events.some(e=>e.tabla==='produccion_revistas_contenidos'&&e.tipo==='crear'&&e.datos_nuevos.id_contenido===id));
  assert(events.some(e=>e.tabla==='produccion_contenidos'&&e.tipo==='editar'&&!e.datos_anteriores.destino_revista&&e.datos_nuevos.destino_revista));
  await db.query('DELETE FROM produccion_revistas_contenidos WHERE id_contenido=$1',[id]);
  assert((await db.query("SELECT 1 FROM eventos_de_usuarios WHERE id_solicitud=$1 AND tabla='produccion_revistas_contenidos' AND tipo='borrar'",[requestId])).rowCount);
  await db.query('ROLLBACK');
 });
 assert.equal((await db.query('SELECT 1 FROM produccion_contenidos WHERE id_contenido=$1',[id])).rowCount,0);
 assert.equal((await db.query('SELECT 1 FROM eventos_de_usuarios WHERE id_solicitud=$1',[requestId])).rowCount,0);
 await db.query('CREATE SCHEMA '+schema);await db.query('SET search_path TO '+schema+',public');
 for(const table of ['produccion_contenidos','servicios_revistas','produccion_revistas_contenidos','produccion_control_redaccion'])await db.query(`CREATE TABLE ${schema}.${table} (LIKE public.${table} INCLUDING ALL)`);
 await db.query("INSERT INTO servicios_revistas(id_revista,revista) VALUES('parallel_mag','Prueba')");
 const content=(await db.query("INSERT INTO produccion_contenidos(id_contenido,tipo_contenido) VALUES('parallel','anuncio') RETURNING *")).rows[0];
 for(let i=0;i<2;i++){const c=await originalConnect();await c.query('SET search_path TO '+schema+',public');clients.push(c);}
 const queue=[...clients];pool.connect=async()=>{const c=queue.shift();assert(c);return {query:(...args)=>c.query(...args),release(){}};};
 const results=await Promise.allSettled([0,1].map(()=>assignContentMagazine('parallel_mag',{id_contenido:'parallel',tipo:'anuncios',expectedVersion:content.updated_at})));
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert(results.some(r=>r.status==='rejected'&&r.reason.status===409));
 assert.equal((await db.query('SELECT 1 FROM produccion_revistas_contenidos')).rowCount,1);
 console.log('PASS: asignacion a revistas existentes, relaciones y auditoria antes/despues/borrado, rollback y conflicto concurrente sin duplicados.');
}finally{
 pool.connect=originalConnect;
 for(const c of clients){await c.query('RESET search_path');c.release();}
 await db.query('ROLLBACK');await db.query('SET search_path TO public');await db.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');db.release();await pool.end();
}
