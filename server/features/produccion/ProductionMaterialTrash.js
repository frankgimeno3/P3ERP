import {getPgPool} from '../../database/pgClient.js';
import {assertObjectExistsInS3} from '../mediateca/S3Service.js';
import {resolveInvalidMaterialState} from './ProductionMaterialState.js';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export async function changeProductionMaterial(contentId,data,transactionDb=null,verifyObject=assertObjectExistsInS3){
 const db=transactionDb||await getPgPool().connect();
 try{
  await db.query(transactionDb?'SAVEPOINT p3_material_change':'BEGIN');
  const content=(await db.query('SELECT * FROM produccion_contenidos WHERE id_contenido=$1 FOR UPDATE',[contentId])).rows[0];
  if(!content)fail('Contenido no encontrado.',404);
  if(!['eliminar','restaurar','editar'].includes(data.accion))fail('Acción de material no válida.');
  const material=(await db.query(`SELECT m.*,a.mediateca_s3_key FROM produccion_materiales m LEFT JOIN mediateca_archivos a ON a.mediateca_content_id::text=m.mediateca_id
   WHERE m.id_material=$1 AND (m.id_contenido=$2 OR $3::jsonb ? m.id_material) FOR UPDATE OF m`,[data.id_material,contentId,JSON.stringify(content.array_ids_materiales||[])])).rows[0];
  if(!material)fail('Material no encontrado en este contenido.',404);
  if(!data.version||new Date(data.version).getTime()!==new Date(material.updated_at).getTime())fail('El material ha cambiado. Recarga antes de continuar.',409);
  if(data.accion==='eliminar'){
   if(data.confirmado!==true)fail('Confirma que quieres eliminar el material.');
   if(material.eliminado_at)fail('El material ya está en la papelera.',409);
   if((material.id_contenido&&material.id_contenido!==contentId)||(await db.query("SELECT 1 FROM produccion_contenidos WHERE id_contenido<>$1 AND array_ids_materiales ? $2 LIMIT 1",[contentId,material.id_material])).rowCount)fail('El material está compartido con otro contenido; no se puede eliminar desde esta ficha.',409);
   await db.query("UPDATE produccion_materiales SET id_contenido=coalesce(id_contenido,$2),eliminado_at=clock_timestamp(),updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 millisecond') WHERE id_material=$1",[material.id_material,contentId]);
   await db.query("UPDATE produccion_contenidos SET array_ids_materiales=coalesce(array_ids_materiales,'[]'::jsonb)-$2,updated_at=clock_timestamp() WHERE id_contenido=$1",[contentId,material.id_material]);
  }else if(data.accion==='restaurar'){
   if(!material.eliminado_at)fail('El material no está en la papelera.',409);
   if(material.mediateca_s3_key)await verifyObject(material.mediateca_s3_key);
   await db.query("UPDATE produccion_materiales SET eliminado_at=null,descargado_produccion=false,updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 millisecond') WHERE id_material=$1",[material.id_material]);
   await db.query("UPDATE produccion_contenidos SET array_ids_materiales=CASE WHEN coalesce(array_ids_materiales,'[]'::jsonb) ? $2 THEN array_ids_materiales ELSE coalesce(array_ids_materiales,'[]'::jsonb)||jsonb_build_array($2::text) END,updated_at=clock_timestamp() WHERE id_contenido=$1",[contentId,material.id_material]);
  }else{
   if(material.eliminado_at)fail('Restaura el material antes de editarlo.',409);
   const name=String(data.nombre_material||'').trim(),description=String(data.descripcion_material??'');
   if(!name||name.length>2000||description.length>10000)fail('Cada material debe tener un nombre válido y una descripción de hasta 10.000 caracteres.');
   await db.query("UPDATE produccion_materiales SET nombre_material=$2,descripcion_material=$3,updated_at=GREATEST(clock_timestamp(),updated_at+interval '1 millisecond') WHERE id_material=$1",[material.id_material,name,description]);
   if(material.mediateca_id)await db.query('UPDATE mediateca_archivos SET mediateca_content_name=$2,mediateca_content_description=$3,mediateca_content_updated_at=clock_timestamp() WHERE mediateca_content_id::text=$1',[material.mediateca_id,name,description]);
  }
  if(data.accion!=='editar')await resolveInvalidMaterialState(db,content,data.accion==='restaurar'&&material.tipo==='anuncios'&&material.material_valido===false&&!material.es_version_acabada);
  const updated=(await db.query('SELECT * FROM produccion_materiales WHERE id_material=$1',[material.id_material])).rows[0];
  await db.query(transactionDb?'RELEASE SAVEPOINT p3_material_change':'COMMIT');return updated;
 }catch(e){await db.query(transactionDb?'ROLLBACK TO SAVEPOINT p3_material_change':'ROLLBACK');if(transactionDb)await db.query('RELEASE SAVEPOINT p3_material_change');throw e;}finally{if(!transactionDb)db.release();}
}
