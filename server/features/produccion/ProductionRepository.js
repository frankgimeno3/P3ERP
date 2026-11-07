import {resolveMagazineIssueId} from '../revista/MagazineIssue.js';
import {getPgPool} from '../../database/pgClient.js';
import {contentServiceGroup} from '../../../app/lib/contentServiceGroups.js';
import {contentPending,contentTypes,materialType} from '../../../app/lib/productionManagement.js';
import {productionStage,productionStages} from '../../../app/lib/productionWorkflow.js';
import {magazineContentExpression,editorialContentExpression} from './ProductionContentScope.js';
import {getMagazineList,matchesLegacy} from './GestionesProduccionRepository.js';
import {articleMatchesMagazine} from '../../../app/config/editorialMagazine.js';

export async function getContentServiceGroups() {
 return (await getPgPool().query("SELECT id_medio,CASE WHEN id_medio='vidrioperfil_newsletter' THEN 'Banner news' ELSE nombre_medio END nombre_medio FROM servicios_grupos_servicios WHERE id_medio<>'suscripcion' ORDER BY nombre_medio,id_medio")).rows;
}

export async function getRepositoryContents() {
 const groups=await getContentServiceGroups();
 const rows=(await getPgPool().query(`SELECT c.*,cu.nombre_empresa AS nombre_cuenta,a.nombre_completo_agente,s.id_medio,
  ${magazineContentExpression} AS es_revista,${editorialContentExpression} AS es_editorial,
  COALESCE(NULLIF(s.nombre_servicio_es,''),NULLIF(c.tipo_revista_servicio,''),c.servicio,'') AS nombre_servicio
  FROM produccion_contenidos c LEFT JOIN comercial_cuentas cu ON cu.id_cuenta=c.id_cuenta
  LEFT JOIN agentes_db a ON a.id_agente=c.id_agente LEFT JOIN servicios_db s ON s.id_servicio=c.servicio
  ORDER BY c.created_at DESC,c.id_contenido`)).rows;
 return rows.map(row=>{const id=contentServiceGroup(row);return {...row,es_revista:Boolean(row.es_revista||id==='revista'),grupo_servicio:id,nombre_grupo_servicio:groups.find(group=>group.id_medio===id)?.nombre_medio||id};});
}
export async function getPendingMagazineContents() {
 const [contents,magazines,links,editorials,materials]=await Promise.all([
  getRepositoryContents(),getMagazineList(),getPgPool().query('SELECT id_contenido,id_revista FROM produccion_revistas_contenidos'),
  getPgPool().query('SELECT id_contenido,revista,espana_previsto_numero,latam_previsto_numero,especial_numero,hueco_previsto FROM produccion_articulos_contenidos WHERE id_contenido IS NOT NULL'),
  getPgPool().query('SELECT * FROM produccion_materiales WHERE eliminado_at IS NULL'),
 ]);
 const editorialById=new Map(),linked=new Map();
 for(const row of editorials.rows){if(!editorialById.has(row.id_contenido))editorialById.set(row.id_contenido,[]);editorialById.get(row.id_contenido).push(row);}
 for(const row of links.rows){if(!linked.has(row.id_contenido))linked.set(row.id_contenido,new Set());linked.get(row.id_contenido).add(row.id_revista);}
 return contents.filter(row=>row.es_revista&&contentPending(row)).map(row=>({...workflowRow({...row,es_editorial:editorialById.has(row.id_contenido)},materials.rows),revistas_vinculadas:magazines.filter(m=>(m.ids_revistas||[m.id_revista]).some(id=>linked.get(row.id_contenido)?.has(id))
  || (m.ids_publicaciones||[m.id_publicacion]).some(id=>!!id&&(row.id_publicacion===id||row.contenido_especifico_id===id))
  || editorialById.get(row.id_contenido)?.some(article=>articleMatchesMagazine(article,m))||matchesLegacy(row,m)).map(m=>m.id_revista)}));
}

function workflowRow(row,materials){
 const types=row.es_editorial?[...new Set([...contentTypes(row).filter(type=>type!=='otro'),'articulo'])]:contentTypes(row);
 const phasesByType=types.filter(type=>contentPending({...row,tipo:materialType(type)})).map(type=>({tipo:materialType(type),fase:productionStage({...row,tipo:materialType(type),materiales:materials.filter(m=>(m.id_contenido===row.id_contenido||(row.array_ids_materiales||[]).includes(m.id_material))&&(!m.tipo||m.tipo===materialType(type)))})}));
 const phases=[...new Set(phasesByType.map(item=>item.fase))];
 return {...row,fase:phases[0],fases_tipos:phasesByType,fase_nombre:phases.map(value=>productionStages.find(stage=>stage.value===value)).filter(Boolean).map(stage=>`${stage.label} · ${stage.title}`).join(' / ')};
}

export async function getPendingOtherContents(){
 const [rows,materials]=await Promise.all([getRepositoryContents(),getPgPool().query('SELECT * FROM produccion_materiales WHERE eliminado_at IS NULL')]);
 return rows.filter(row=>!row.es_revista&&row.grupo_servicio!=='suscripcion'&&contentPending(row)).map(row=>workflowRow(row,materials.rows));
}

export async function getPendingMagazineOverview(){
 const [magazines,contents]=await Promise.all([getMagazineList(),getPendingMagazineContents()]);
 return magazines.map(magazine=>{
  const assigned=contents.filter(row=>row.revistas_vinculadas.includes(magazine.id_revista));
  const deliverables=assigned.flatMap(row=>row.fases_tipos).filter(item=>item.tipo==='articulos'||item.tipo==='anuncios');
  const articles=deliverables.filter(item=>item.tipo==='articulos').length;
  const ads=deliverables.filter(item=>item.tipo==='anuncios').length;
  const receiving=deliverables.filter(item=>item.fase==='recibir').length;
  return {...magazine,articulos_pendientes:articles,anuncios_pendientes:ads,contenidos_pendientes:assigned.length,pendiente_recibir:receiving,en_proceso:deliverables.length-receiving};
 }).filter(row=>row.contenidos_pendientes>0);
}
export async function assignContentMagazine(idRevista,data,transactionDb=null) {
 const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
 if(!['articulos','anuncios'].includes(data.tipo)||!data.id_contenido)fail('Selecciona el contenido y su tipo.');
 if(!data.expectedVersion)fail('Recarga el contenido antes de asignarlo.',409);
 const db=transactionDb||await getPgPool().connect();
 try {
  if(!transactionDb)await db.query('BEGIN');await db.query("SET LOCAL lock_timeout='3s'");
  const row=(await db.query('SELECT * FROM produccion_contenidos WHERE id_contenido=$1 FOR UPDATE',[data.id_contenido])).rows[0];
  if(!row)fail('Contenido no encontrado.',404);
  idRevista=await resolveMagazineIssueId(idRevista,db);
  if(!idRevista)fail('Revista no encontrada.',404);
  if(new Date(row.updated_at).getTime()!==new Date(data.expectedVersion).getTime())fail('El contenido ha cambiado. Recarga antes de asignarlo.',409);
  if(!contentPending(row))fail('El contenido ya está publicado o cancelado.',409);
  if(!(await db.query('SELECT 1 FROM servicios_revistas WHERE id_revista=$1 FOR SHARE',[idRevista])).rowCount)fail('Revista no encontrada.',404);
  const editorial=(await db.query('SELECT 1 FROM produccion_articulos_contenidos WHERE id_contenido=$1',[row.id_contenido])).rowCount;
  const allowed=contentTypes(row).filter(type=>type!=='otro').map(type=>type==='articulo'?'articulos':'anuncios');
  if(editorial&&!allowed.includes('articulos'))allowed.push('articulos');
  if(!allowed.includes(data.tipo))fail('El tipo seleccionado no corresponde al contenido.');
  await db.query('INSERT INTO produccion_revistas_contenidos(id_revista,id_contenido,tipo) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[idRevista,row.id_contenido,data.tipo]);
  await db.query('UPDATE produccion_contenidos SET destino_revista=true,hoja_prod=true,updated_at=clock_timestamp() WHERE id_contenido=$1',[row.id_contenido]);
  if(!transactionDb)await db.query('COMMIT');return {ok:true,id_revista:idRevista,id_contenido:row.id_contenido};
 } catch(error){if(!transactionDb)await db.query('ROLLBACK');throw error;} finally{if(!transactionDb)db.release();}
}
export async function getRepositoryMaterials(contentId='',includeDeleted=false,db=getPgPool()) {
 return (await db.query(`SELECT m.*,COALESCE(m.id_contenido,c.id_contenido) AS id_contenido,c.nombre_contenido,c.estado_contenido,cu.nombre_empresa AS nombre_cuenta
  FROM produccion_materiales m LEFT JOIN LATERAL (SELECT c.* FROM produccion_contenidos c
   WHERE c.id_contenido=m.id_contenido OR (m.id_contenido IS NULL AND c.array_ids_materiales @> jsonb_build_array(m.id_material))
   ORDER BY c.id_contenido LIMIT 1) c ON true
  LEFT JOIN comercial_cuentas cu ON cu.id_cuenta=c.id_cuenta
  WHERE ($2::boolean OR m.eliminado_at IS NULL) AND ($1='' OR m.id_contenido=$1 OR EXISTS(SELECT 1 FROM produccion_contenidos linked WHERE linked.id_contenido=$1 AND linked.array_ids_materiales @> jsonb_build_array(m.id_material)))
  ORDER BY m.es_version_acabada DESC,m.numero_version DESC NULLS LAST,m.created_at DESC,m.id_material`,[contentId,Boolean(contentId&&includeDeleted)])).rows;
}
