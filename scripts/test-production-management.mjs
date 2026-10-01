import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import env from '@next/env';
import { getPgPool } from '../server/database/pgClient.js';
import { addProductionMaterial, reviewProductionMaterial } from '../server/features/produccion/GestionesProduccionRepository.js';

env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),schema='test_production_'+randomUUID().replaceAll('-','');
const connect=pool.connect.bind(pool),query=pool.query.bind(pool);
try {
  await db.query('CREATE SCHEMA '+schema);
  await db.query('SET search_path TO '+schema+',public');
  for(const table of ['produccion_contenidos','produccion_materiales','mediateca_carpetas','mediateca_archivos','servicios_revistas','produccion_revistas_contenidos'])
    await db.query('CREATE TABLE '+schema+'.'+table+' (LIKE public.'+table+' INCLUDING ALL)');
  await db.query("INSERT INTO produccion_contenidos(id_contenido,hoja_prod) VALUES('content_test',true)");
  await db.query("INSERT INTO servicios_revistas(id_revista,revista,edicion,publicacion) VALUES('rev_test_1','Vidrio Plano','Iberia','1'),('rev_test_2','Vidrio Plano','Iberia','2')");
  pool.connect=async()=>({query:(...args)=>db.query(...args),release(){}});pool.query=(...args)=>db.query(...args);
  const fakeFile=(revista)=>{const mediaId=randomUUID();return {id_contenido:'content_test',id_revista:revista,tipo:'articulos',mediaId,nombre_material:'Archivo de prueba',contentType:'application/pdf',s3Key:`mediateca/documentos_produccion/documentos_revistas/${revista}/articulos/content_test/${mediaId}/file.pdf`};};
  const first=await addProductionMaterial(fakeFile('rev_test_1'),async()=>{});
  const second=await addProductionMaterial(fakeFile('rev_test_2'),async()=>{});
  await assert.rejects(addProductionMaterial({...fakeFile('rev_test_1'),s3Key:'mediateca/documentos_produccion/documentos_revistas/rev_test_1/articulos/content_test/other/file.pdf'},async()=>{}),/fuera de la carpeta/);
  assert.notEqual(first.mediateca_id,second.mediateca_id);
  const folders=(await db.query("SELECT mediateca_folder_id,mediateca_parent_folder_id FROM mediateca_carpetas WHERE mediateca_folder_name='articulos'")).rows;
  assert.equal(folders.length,2);assert.notEqual(folders[0].mediateca_parent_folder_id,folders[1].mediateca_parent_folder_id);
  assert.equal((await db.query("SELECT jsonb_array_length(array_ids_materiales) n FROM produccion_contenidos WHERE id_contenido='content_test'")).rows[0].n,2);
  const reviewed=await reviewProductionMaterial(first.id_material,{validacion_produccion:'incidencia',comentarios:'Falta página'});
  assert.equal(reviewed.validacion_produccion,'incidencia');assert.equal(reviewed.comentarios,'Falta página');
  await assert.rejects(reviewProductionMaterial(first.id_material,{validacion_produccion:'inventado'}),/Estado/);
  console.log('PASS: material linked atomically to content and mediateca; article folders isolated by magazine; review persisted.');
} finally {
  pool.connect=connect;pool.query=query;
  await db.query('SET search_path TO public');
  await db.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');
  db.release();await pool.end();
}
