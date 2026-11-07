import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import env from '@next/env';
import {getPgPool} from '../server/database/pgClient.js';
import {withUserEventContext} from '../server/features/userEvents/EventContext.js';
import {externalUserEvent} from '../server/features/userEvents/ExternalUserEvents.js';
import {createPresignedUpload,createPresignedDownload,assertObjectExistsInS3,deleteObjectFromS3} from '../server/features/mediateca/S3Service.js';
import {addProductionMaterials} from '../server/features/produccion/GestionesProduccionRepository.js';
import {changeProductionMaterial} from '../server/features/produccion/ProductionMaterialTrash.js';
import {productionMaterialAction} from '../server/features/produccion/ProductionMaterialActions.js';
import {getRepositoryMaterials} from '../server/features/produccion/ProductionRepository.js';
if(!process.argv.includes('--live-s3'))throw Error('Esta prueba requiere --live-s3; crea y elimina únicamente sus objetos temporales.');
env.loadEnvConfig(process.cwd());
const pool=getPgPool(),db=await pool.connect(),id='PRUEBA-S3-'+randomUUID(),objects=[],body=Buffer.from('%PDF-1.4\n% PRUEBA TEMPORAL P3ERP\n'),requestId=randomUUID();
try{await withUserEventContext({enabled:true,actorId:'test-produccion-s3',actorName:'Prueba de materiales S3',requestId,method:'POST',route:'maintenance/test-production-s3',ip:null,ipSource:'prueba'},async()=>{
 try{
  await db.query('BEGIN');
  await db.query("INSERT INTO produccion_contenidos(id_contenido,nombre_contenido,tipo_contenido,estado_contenido,es_prueba,hoja_prod) VALUES($1,'Prueba S3','articulo','Contratado pendiente de recibir',true,true)",[id]);
  const upload=async name=>{const signed=await createPresignedUpload({filename:'PRUEBA_p3erp.pdf',contentType:'application/pdf',prefix:'mediateca/documentos_produccion/material_articulos'});const response=await fetch(signed.uploadUrl,{method:'PUT',headers:{'Content-Type':'application/pdf'},body});assert.equal(response.status,200);objects.push(signed.s3Key);await externalUserEvent('crear','s3_prueba_almacenamiento',signed.s3Key,null,{bucket:'mediateca-plynium-bucket',temporal:true,bytes:body.length,sha256:createHash('sha256').update(body).digest('hex')});return {filename:'PRUEBA_p3erp.pdf',nombre_material:name,descripcion:'Prueba temporal',contentType:'application/pdf',size:body.length,mediaId:signed.mediaId,s3Key:signed.s3Key};};
  const files=[await upload('Material uno'),await upload('Material dos')],destination={id_contenido:id,tipo:'articulos'};
  const raw=await addProductionMaterials({...destination,materiales:files},assertObjectExistsInS3,db);assert.equal(raw.length,2);
  const prepared=await productionMaterialAction(id,{accion:'preparar-descarga',ids:raw.map(m=>m.id_material)},db);assert.equal(prepared.archivos.length,2);
  for(const file of prepared.archivos){const response=await fetch(file.url);assert.equal(response.status,200);assert(Buffer.from(await response.arrayBuffer()).equals(body));}
  assert((await getRepositoryMaterials(id,false,db)).every(m=>!m.descargado_produccion));
  await productionMaterialAction(id,{accion:'marcar',ids:raw.map(m=>m.id_material),descargado:true},db);
  const latest=(await getRepositoryMaterials(id,false,db)).find(m=>m.id_material===raw[0].id_material);
  const removed=await changeProductionMaterial(id,{accion:'eliminar',id_material:latest.id_material,version:latest.updated_at,confirmado:true},db);assert.equal((await getRepositoryMaterials(id,false,db)).length,1);await assertObjectExistsInS3(files[0].s3Key);
  await changeProductionMaterial(id,{accion:'restaurar',id_material:removed.id_material,version:removed.updated_at},db);assert.equal((await getRepositoryMaterials(id,false,db)).length,2);
  const versions=[];for(const name of ['Versión uno','Versión dos'])versions.push(...await addProductionMaterials({...destination,es_version_acabada:true,materiales:[await upload(name)]},assertObjectExistsInS3,db));assert.deepEqual(versions.map(m=>m.numero_version),[1,2]);
  const fileResponse=await fetch(await createPresignedDownload(objects.at(-1)));assert.equal(fileResponse.status,200);assert(Buffer.from(await fileResponse.arrayBuffer()).equals(body));
 }finally{
  await db.query('ROLLBACK');
  const failures=[];for(const key of objects)try{await deleteObjectFromS3(key);await externalUserEvent('borrar','s3_prueba_almacenamiento',key,{bucket:'mediateca-plynium-bucket',temporal:true},null);}catch(e){failures.push({key,error:e.name});}
  if(failures.length)throw Error('Objetos de prueba pendientes de limpiar: '+JSON.stringify(failures));
 }
 });
 assert.equal((await db.query('SELECT 1 FROM produccion_contenidos WHERE id_contenido=$1',[id])).rowCount,0);
 console.log('PASS: archivos reales S3, alta múltiple verificada en RDS, descargas exactas, marcado, papelera y restauración con original conservado, V01/V02, rollback y limpieza auditada de los cuatro objetos temporales.');
}finally{db.release();await pool.end();}
