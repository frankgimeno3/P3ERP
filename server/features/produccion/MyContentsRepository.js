import {getPgPool} from '../../database/pgClient.js';
import {contentPending,contentTypes,materialType} from '../../../app/lib/productionManagement.js';
import {productionStage,productionStages} from '../../../app/lib/productionWorkflow.js';
import {contentAttentionReason} from '../../../app/lib/myContents.js';
export async function getMyContents(actorId,db=getPgPool()) {
 if(!actorId)throw Object.assign(new Error('No autenticado.'),{status:401});
 const rows=(await db.query(`SELECT c.*,cu.nombre_empresa AS nombre_cuenta,
  COALESCE(NULLIF(c.id_contrato,''),(SELECT ct.id_contrato FROM comercial_contratos ct
    WHERE ct.array_contenidos @> jsonb_build_array(jsonb_build_object('id_contenido',c.id_contenido)) ORDER BY ct.id_contrato LIMIT 1)) AS id_contrato
  FROM produccion_contenidos c LEFT JOIN comercial_cuentas cu ON cu.id_cuenta=c.id_cuenta
  WHERE c.id_agente=$1 OR (NULLIF(c.id_agente,'') IS NULL AND EXISTS(SELECT 1 FROM comercial_contratos ct
    WHERE ct.id_agente_contrato=$1 AND (ct.id_contrato=c.id_contrato OR ct.array_contenidos @> jsonb_build_array(jsonb_build_object('id_contenido',c.id_contenido)))))
  ORDER BY c.created_at DESC,c.id_contenido`,[actorId])).rows.filter(contentPending);
 if(!rows.length)return [];
 const ids=rows.map(row=>row.id_contenido),materials=(await db.query(`SELECT m.* FROM produccion_materiales m
  WHERE m.id_contenido=ANY($1::text[]) OR EXISTS(SELECT 1 FROM produccion_contenidos c
    WHERE c.id_contenido=ANY($1::text[]) AND c.array_ids_materiales @> jsonb_build_array(m.id_material))`,[ids])).rows;
 return rows.map(row=>{
  const item={...row,tipo:materialType(contentTypes(row)[0]),materiales:materials.filter(m=>m.id_contenido===row.id_contenido||(row.array_ids_materiales||[]).includes(m.id_material))};
  const fase=productionStage(item),motivo=contentAttentionReason(item);
  return {id_contenido:row.id_contenido,nombre_contenido:row.nombre_contenido||row.especificaciones_contenido||row.id_contenido,nombre_cuenta:row.nombre_cuenta||row.cliente_hoja||'Sin empresa',estado_contenido:row.estado_contenido,deadline_contenido:row.deadline_contenido||'',formato_revista:row.formato_revista,fase,fase_nombre:productionStages.find(stage=>stage.value===fase)?.title||'',motivo_atencion:motivo};
 });
}
