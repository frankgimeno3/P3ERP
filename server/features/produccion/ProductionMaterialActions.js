import {getPgPool} from '../../database/pgClient.js';
import {assertObjectExistsInS3,createPresignedDownload,readDocumentObject} from '../mediateca/S3Service.js';
import XLSX from 'xlsx';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
export async function productionMaterialAction(contentId,data,transactionDb=null,storage={verify:assertObjectExistsInS3,download:createPresignedDownload,read:readDocumentObject}){
 const db=transactionDb||await getPgPool().connect();
 try{
  if(!transactionDb)await db.query('BEGIN');
  const content=(await db.query('SELECT * FROM produccion_contenidos WHERE id_contenido=$1 FOR UPDATE',[contentId])).rows[0];
  if(!content)fail('Contenido no encontrado.',404);
  if(!['marcar','descargar','validar','texto-descargado'].includes(data.accion))fail('Acción inválida.');
  const rows=(await db.query(`SELECT m.*,a.mediateca_s3_key FROM produccion_materiales m LEFT JOIN mediateca_archivos a ON a.mediateca_content_id::text=m.mediateca_id
   WHERE (m.id_contenido=$1 OR ($2::jsonb ? m.id_material)) AND NOT m.es_version_acabada ORDER BY m.id_material FOR UPDATE OF m`,[contentId,JSON.stringify(content.array_ids_materiales||[])])).rows;
  const ids=data.ids;
  if(data.accion!=='texto-descargado'&&(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!rows.some(row=>row.id_material===id))))fail('Selecciona materiales de este contenido.');
  const selected=rows.filter(row=>ids?.includes(row.id_material)),files=[];
  const archive=data.zip&&data.accion==='descargar'?XLSX.CFB.utils.cfb_new():null;let total=0;
  if(data.accion==='descargar')for(const row of selected){
   if(!row.mediateca_s3_key)fail(`El material «${row.nombre_material}» no tiene un archivo en almacenamiento.`);
   await storage.verify(row.mediateca_s3_key);
   if(archive){const buffer=await storage.read(row.mediateca_s3_key,200*1024*1024-total);total+=buffer.length;
    const name=String(row.nombre_material||'material').replace(/[\\/\x00-\x1f]/g,'_'),ext=row.mediateca_s3_key.match(/\.[a-z0-9]+$/i)?.[0]||'';
    XLSX.CFB.utils.cfb_add(archive,`${files.length+1}_${name}${name.toLowerCase().endsWith(ext.toLowerCase())?'':ext}`,buffer);
    files.push({id:row.id_material,nombre:name});
   }else files.push({id:row.id_material,nombre:row.nombre_material,url:await storage.download(row.mediateca_s3_key)});
  }
  if(['marcar','descargar'].includes(data.accion)){
   if(data.accion==='marcar'&&typeof data.descargado!=='boolean')fail('Indica si está descargado.');
   await db.query('UPDATE produccion_materiales SET descargado_produccion=$2,updated_at=clock_timestamp() WHERE id_material=ANY($1::text[]) AND descargado_produccion IS DISTINCT FROM $2',[ids,data.accion==='descargar'||data.descargado]);
  }
  if(data.accion==='validar'){
   if(typeof data.valido!=='boolean')fail('Indica si el material es válido.');
   await db.query('UPDATE produccion_materiales SET material_valido=$2,updated_at=clock_timestamp() WHERE id_material=ANY($1::text[])',[ids,data.valido]);
   if(!data.valido&&selected.some(row=>row.tipo==='anuncios'))await db.query("UPDATE produccion_contenidos SET estado_contenido='Material inválido',estado_material_contenido='Material inválido',updated_at=clock_timestamp() WHERE id_contenido=$1",[contentId]);
  }
  if(data.accion==='texto-descargado')await db.query('UPDATE produccion_contenidos SET texto_revision_descargada=texto_revision,texto_fecha_descarga=clock_timestamp(),updated_at=clock_timestamp() WHERE id_contenido=$1',[contentId]);
  const zip=archive?XLSX.CFB.write(archive,{type:'buffer',fileType:'zip',compression:true}):null;
  if(!transactionDb)await db.query('COMMIT');return {ok:true,archivos:files,zip};
 }catch(e){if(!transactionDb)await db.query('ROLLBACK');throw e;}finally{if(!transactionDb)db.release();}
}
