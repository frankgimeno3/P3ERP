import {createHash} from 'node:crypto';
import {getPgPool} from '../../database/pgClient.js';
import {getMagazineManagement} from './GestionesProduccionRepository.js';
import {resolveMagazineIssueId} from '../revista/MagazineIssue.js';
import {verifyFinalContentPdf} from './FinalContentPdf.js';
import {assertObjectExistsInS3,createPresignedDownload} from '../mediateca/S3Service.js';
import {buildMagazineLayout,layoutKey,layoutSupports,layoutFormatMatches} from '../../../app/lib/magazineLayout.js';
import {productionStage} from '../../../app/lib/productionWorkflow.js';

const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const supportValue=value=>{if(!layoutSupports.includes(value))fail('Selecciona impresa o digital.');return value;};
const fields=row=>({id_contenido:row.id_contenido,tipo:row.tipo,posicion:Number(row.posicion),paginas:Number(row.paginas),seccion:row.seccion,id_material:row.id_material});

async function snapshot(db,id,support) {
  const issueId=await resolveMagazineIssueId(id,db); if(!issueId)fail('Revista no encontrada.',404);
  const management=await getMagazineManagement(issueId,db);if(!management)fail('Revista no encontrada.',404);
  const settings=(await db.query('SELECT * FROM produccion_maquetas WHERE id_revista=$1 ORDER BY soporte',[issueId])).rows;
  const current=settings.find(row=>row.soporte===support);
  const entries=(await db.query('SELECT * FROM produccion_maqueta_contenidos WHERE id_revista=$1 AND soporte=$2 ORDER BY posicion,id_contenido,tipo',[issueId,support])).rows.map(fields);
  const model=buildMagazineLayout(management.contenidos,entries,support,current?.total_paginas||management.revista.num_paginas||8,current?.estado==='publicada');
  const version=current?.version||0;
  const revision=createHash('sha256').update(JSON.stringify({version,support,estado:current?.estado||'pendiente',total:model.total,entries,contents:management.contenidos.map(row=>[row.id_contenido,row.tipo,row.updated_at,row.estado_contenido,row.estados_produccion,row.formato_revista,row.maquetacion_produccion,row.materiales.map(m=>[m.id_material,m.updated_at,m.pdf_paginas,m.material_valido])])})).digest('hex');
  return {id:issueId,management,settings,current,entries,model,version,revision,support};
}
function view(value) {
  const {management,settings,current,entries,model,version,revision,support}=value;
  return {id_revista:value.id,soporte:support,estado:current?.estado||'pendiente',total_paginas:model.total,version,revision,
    estados:Object.fromEntries(layoutSupports.map(key=>[key,settings.find(row=>row.soporte===key)?.estado||'pendiente'])),entradas:entries,
    contenidos:management.contenidos.map(row=>({id_contenido:row.id_contenido,tipo:row.tipo,nombre_contenido:row.nombre_contenido,titulo_articulo:row.titulo_articulo,especificaciones_contenido:row.especificaciones_contenido,nombre_empresa:row.nombre_empresa,cliente_hoja:row.cliente_hoja,
      estado_contenido:row.estado_contenido,estados_produccion:row.estados_produccion,formato_revista:row.formato_revista,paginas_ocupadas:row.paginas_ocupadas,posicion_revista:row.posicion_revista,maquetacion_produccion:row.maquetacion_produccion,
      materiales:row.materiales.map(m=>({id_material:m.id_material,nombre_material:m.nombre_material,numero_version:m.numero_version,pdf_paginas:m.pdf_paginas,es_version_acabada:m.es_version_acabada,material_valido:m.material_valido,eliminado_at:m.eliminado_at}))}))};
}
export async function getMagazineLayout(id,support='impresa',pool=getPgPool()) {
  supportValue(support);const db=await pool.connect();
  try{await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const data=view(await snapshot(db,id,support));await db.query('COMMIT');return data;}
  catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
export async function saveMagazineLayout(id,data,pool=getPgPool()) {
  const support=supportValue(data.soporte);if(!Number.isInteger(data.expectedVersion)||data.expectedVersion<0)fail('Recarga la maqueta antes de guardar.',409);
  if(!['contenido','retirar','estado','paginas'].includes(data.accion))fail('Acción de maqueta no válida.');
  const db=await pool.connect();
  try {
    await db.query('BEGIN');id=await resolveMagazineIssueId(id,db);if(!id)fail('Revista no encontrada.',404);
    await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`maqueta:${id}:${support}`]);
    let value=await snapshot(db,id,support);
    const contentIds=[...new Set(value.management.contenidos.map(row=>row.id_contenido))].sort();
    if(contentIds.length)await db.query('SELECT id_contenido FROM produccion_contenidos WHERE id_contenido=ANY($1::text[]) ORDER BY id_contenido FOR UPDATE',[contentIds]);
    value=await snapshot(db,id,support);
    if(value.version!==data.expectedVersion||data.revision!==value.revision)fail('La maqueta o sus contenidos han cambiado. Actualiza antes de guardar.',409);
    const previousCollisions=new Set(value.model.issues.filter(message=>message.includes(': coinciden')));
    if(value.current?.estado==='publicada'&&!(data.accion==='estado'&&data.estado==='pendiente'))fail('Cambia la maqueta a pendiente antes de modificarla.',409);
    let status=value.current?.estado||'pendiente',total=value.model.total;
    if(data.accion==='estado'){if(!['pendiente','publicada'].includes(data.estado))fail('Estado de maqueta no válido.');status=data.estado;}
    if(status==='publicada'&&(!value.model.items.length||value.model.issues.length))fail(value.model.issues.join(' ')||'Añade contenidos con PDF final antes de publicar.');
    if(data.accion==='paginas') {
      total=Number(data.total_paginas);if(!Number.isInteger(total)||total<2||total>1000||total%2)fail('Indica un número par de páginas físicas, entre 2 y 1000.');
      if(total<value.model.total&&value.model.items.some(item=>item.posicion+item.paginas+1>total))fail('No puedes retirar páginas ocupadas por un contenido.');
    }
    await db.query(`INSERT INTO produccion_maquetas(id_revista,soporte,estado,total_paginas,version) VALUES($1,$2,$3,$4,1)
      ON CONFLICT(id_revista,soporte) DO UPDATE SET estado=excluded.estado,total_paginas=excluded.total_paginas,version=produccion_maquetas.version+1,updated_at=clock_timestamp()`,[id,support,status,total]);
    if(data.accion==='contenido') {
      const key=layoutKey(data.entrada||{}),content=value.management.contenidos.find(row=>layoutKey(row)===key&&layoutFormatMatches(row,support)&&productionStage(row)==='publicacion');
      if(!content)fail('Selecciona un contenido en fase 6 de esta revista y formato.');
      await db.query('SELECT id_contenido FROM produccion_contenidos WHERE id_contenido=$1 FOR UPDATE',[content.id_contenido]);
      const entry=await verifyFinalContentPdf(db,content.id_contenido,data.entrada,undefined,value.management.revista.ids_revistas||[id]);
      await upsertEntry(db,id,support,entry);
    }
    if(data.accion==='retirar') {
      if(!data.id_contenido||!['articulos','anuncios'].includes(data.tipo))fail('Selecciona una asignación válida.');
      await db.query('DELETE FROM produccion_maqueta_contenidos WHERE id_revista=$1 AND soporte=$2 AND id_contenido=$3 AND tipo=$4',[id,support,data.id_contenido,data.tipo]);
    }
    if(status==='publicada')for(const item of [...value.model.items].sort((a,b)=>a.key.localeCompare(b.key))){await verifyFinalContentPdf(db,item.id_contenido,item,undefined,value.management.revista.ids_revistas||[id]);await upsertEntry(db,id,support,item);}
    value=await snapshot(db,id,support);
    // Incomplete historical contents may be configured one by one; overlapping pages never save.
    const collisions=value.model.issues.filter(message=>message.includes(': coinciden')&&!previousCollisions.has(message));
    if(collisions.length&&data.accion!=='estado')fail(collisions.join(' '));
    if(status==='publicada') {
      if(!value.model.items.length||value.model.issues.length)fail(value.model.issues.join(' ')||'Añade contenidos con PDF final antes de publicar.');
    }
    await db.query('UPDATE produccion_maquetas SET total_paginas=$3 WHERE id_revista=$1 AND soporte=$2',[id,support,value.model.total]);
    const result=view(await snapshot(db,id,support));await db.query('COMMIT');return result;
  } catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
async function upsertEntry(db,id,support,entry) {
  await db.query(`INSERT INTO produccion_maqueta_contenidos(id_revista,soporte,id_contenido,tipo,posicion,paginas,seccion,id_material)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id_revista,soporte,id_contenido,tipo) DO UPDATE
    SET posicion=excluded.posicion,paginas=excluded.paginas,seccion=excluded.seccion,id_material=excluded.id_material,updated_at=clock_timestamp()`,[id,support,entry.id_contenido,entry.tipo,entry.posicion,entry.paginas,entry.seccion,entry.id_material]);
}
export async function getLayoutFile(id,support,materialId,pool=getPgPool(),storage={verify:assertObjectExistsInS3,download:createPresignedDownload}) {
  supportValue(support);const db=await pool.connect();
  try {await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const value=await snapshot(db,id,support);
    const allowed=value.management.contenidos.some(row=>(value.current?.estado==='publicada'?value.entries.some(entry=>entry.id_material===materialId&&layoutKey(entry)===layoutKey(row)):layoutFormatMatches(row,support)&&productionStage(row)==='publicacion')&&row.materiales.some(m=>m.id_material===materialId&&m.es_version_acabada&&!m.eliminado_at&&m.material_valido!==false));
    if(!allowed)fail('PDF no encontrado en esta revista y formato.',404);
    const file=await signedFile(db,materialId,storage);await db.query('COMMIT');return file;
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
async function signedFile(db,id,storage) {
  const row=(await db.query(`SELECT m.id_material,m.pdf_paginas,a.mediateca_s3_key FROM produccion_materiales m JOIN mediateca_archivos a ON a.mediateca_content_id::text=m.mediateca_id
    WHERE m.id_material=$1 AND m.es_version_acabada AND m.eliminado_at IS NULL AND m.material_valido IS DISTINCT FROM false`,[id])).rows[0];
  if(!row?.mediateca_s3_key)fail('El PDF final ya no está disponible.',409);
  const metadata=await storage.verify(row.mediateca_s3_key);
  return {id:row.id_material,paginas:row.pdf_paginas,size:metadata.size,url:await storage.download(row.mediateca_s3_key)};
}
export async function getMagazineDownload(id,support,revision,pool=getPgPool(),storage={verify:assertObjectExistsInS3,download:createPresignedDownload}) {
  supportValue(support);const db=await pool.connect();
  try {
    await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');const value=await snapshot(db,id,support);
    if(revision!==value.revision)fail('La maqueta ha cambiado. Actualiza antes de descargar.',409);
    if(!value.model.items.length||value.model.issues.length)fail(value.model.issues.join(' ')||'No hay PDF finales para descargar.');
    const files=[],seen=new Set();let size=0;
    for(const item of value.model.items)if(!seen.has(item.id_material)){seen.add(item.id_material);const file=await signedFile(db,item.id_material,storage);size+=file.size;if(size>200*1024*1024)fail('La descarga conjunta supera 200 MB.',413);files.push(file);}
    const pages=value.model.pages.map(page=>page.item?{material:page.item.id_material,index:page.parte-1}:null);
    await db.query('COMMIT');return {revision:value.revision,version:value.version,soporte:support,total:value.model.total,files,pages,nombre:`${value.management.revista.revista} ${value.management.revista.numero_publicacion||''} ${support}.pdf`};
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
