import {contentPending,contentTypes} from '../../../app/lib/productionManagement.js';
import {productionStatesByType,aggregateProductionState} from '../../../app/lib/productionWorkflow.js';
export async function setProductionTypeState(db,content,type,state){
 const typedContent={...content,es_editorial:Boolean(content.es_editorial||content.articulo_origen_id)},states={...productionStatesByType(typedContent),[type]:state};
 const overall=aggregateProductionState(states);
 await db.query('UPDATE produccion_contenidos SET estados_produccion=$2::jsonb,estado_contenido=$3,estado_material_contenido=$4,updated_at=clock_timestamp() WHERE id_contenido=$1',[content.id_contenido,JSON.stringify(states),overall,state==='Material inválido'?state:state==='Contratado pendiente de recibir'?'Pendiente de recibir':'Recibido']);
 content.estados_produccion=states;content.estado_contenido=overall;
}
export async function resolveInvalidMaterialState(db,content,invalidRestored=false){
 if(!contentTypes({...content,es_editorial:Boolean(content.es_editorial||content.articulo_origen_id)}).includes('anuncio')||!contentPending({...content,tipo:'anuncios'}))return;
 if(invalidRestored){await setProductionTypeState(db,content,'anuncios','Material inválido');return;}
 const rows=(await db.query(`SELECT material_valido,validacion_produccion FROM produccion_materiales WHERE id_contenido=$1 AND tipo='anuncios' AND NOT es_version_acabada AND eliminado_at IS NULL`,[content.id_contenido])).rows;
 const current=rows.filter(row=>row.material_valido!==false);
 await setProductionTypeState(db,content,'anuncios',current.length?(current.every(row=>row.validacion_produccion==='ok produccion')?'Material OK - pendiente de publicar':'Pendiente de gestionar Charly'):(rows.length?'Material inválido':'Contratado pendiente de recibir'));
}
