import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {withUserEventContext} from '../server/features/userEvents/EventContext.js';
import {addProductionMaterials} from '../server/features/produccion/GestionesProduccionRepository.js';
import {productionStage} from '../app/lib/productionWorkflow.js';
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),id='PRUEBA-materiales-'+randomUUID(),requestId=randomUUID();
const file=()=>{const mediaId=randomUUID();return {filename:'material.pdf',size:4,contentType:'application/pdf',nombre_material:'Nombre elegido',descripcion:'Descripción propia',mediaId,s3Key:`mediateca/documentos_produccion/material_articulos/${mediaId}/material.pdf`};};
try{
 await withUserEventContext({actorId:'test-materiales',actorName:'Prueba de lote',requestId,route:'/test/materiales',method:'POST',enabled:true,ip:null,ipSource:'prueba'},async()=>{
  await db.query('BEGIN');
  await db.query("INSERT INTO produccion_contenidos(id_contenido,nombre_contenido,tipo_contenido,estado_contenido,es_prueba,hoja_prod) VALUES($1,'Prueba de lote','articulo','Contratado pendiente de recibir',true,true)",[id]);
  const data={id_contenido:id,tipo:'articulos',es_version_acabada:false,materiales:[file(),{...file(),id_contenido:'otro-contenido',tipo:'anuncios'}]};
  const rows=await addProductionMaterials(data,async(_key,expected)=>{assert.deepEqual(expected,{size:4,contentType:'application/pdf'});},db);
  assert.equal(rows.length,2);assert(rows.every(row=>row.id_contenido===id&&row.tipo==='articulos'));
  assert(rows.every(row=>row.nombre_material==='Nombre elegido'&&row.descripcion_material==='Descripción propia'));
  const content=(await db.query('SELECT * FROM produccion_contenidos WHERE id_contenido=$1',[id])).rows[0];
  assert.equal(content.estado_material_contenido,'Recibido');assert.equal(content.array_ids_materiales.length,2);
  assert.equal(productionStage({...content,tipo:'articulos',materiales:rows}),'redaccion');
  const events=async()=>Number((await db.query('SELECT count(*) n FROM eventos_de_usuarios WHERE id_solicitud=$1',[requestId])).rows[0].n);
  const after=await events();assert(after>0);
  const retry=await addProductionMaterials(data,async()=>{throw Error('No se verifica un archivo ya registrado');},db);
  assert.deepEqual(retry.map(row=>row.id_material),rows.map(row=>row.id_material));assert.equal(await events(),after);
  let verified=0;
  await assert.rejects(addProductionMaterials({...data,materiales:[file(),file()]},async()=>{if(++verified===2)throw Error('S3 incompleto');},db),/S3 incompleto/);
  assert.equal((await db.query('SELECT count(*)::int n FROM produccion_materiales WHERE id_contenido=$1',[id])).rows[0].n,2);assert.equal(await events(),after);
  await assert.rejects(addProductionMaterials({...data,materiales:[{...file(),nombre_material:'   '}]},async()=>{},db),/nombre/);
  await assert.rejects(addProductionMaterials({...data,materiales:[{...file(),es_carpeta:true}]},async()=>{},db),/carpetas/);
  await assert.rejects(addProductionMaterials({...data,es_version_acabada:true},async()=>{},db),/único/);
  const audited=(await db.query("SELECT datos_nuevos FROM eventos_de_usuarios WHERE id_solicitud=$1 AND tabla='produccion_materiales' AND tipo='crear'",[requestId])).rows;
  assert.equal(audited.length,2);assert(audited.every(row=>row.datos_nuevos.nombre_material==='Nombre elegido'));
  await db.query('ROLLBACK');
 });
 assert.equal((await db.query('SELECT 1 FROM produccion_contenidos WHERE id_contenido=$1',[id])).rowCount,0);
 assert.equal((await db.query('SELECT 1 FROM eventos_de_usuarios WHERE id_solicitud=$1',[requestId])).rowCount,0);
 console.log('PASS: lote atomico, nombres, destino fijo, reintento sin duplicados, carpetas rechazadas, fases y auditoria con rollback.');
}finally{await db.query('ROLLBACK');db.release();await pool.end();}
