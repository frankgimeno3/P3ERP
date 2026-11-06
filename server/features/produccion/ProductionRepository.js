import {getPgPool} from '../../database/pgClient.js';
import {contentServiceGroup} from '../../../app/lib/contentServiceGroups.js';

export async function getContentServiceGroups() {
 return (await getPgPool().query('SELECT id_medio,nombre_medio FROM servicios_grupos_servicios ORDER BY nombre_medio,id_medio')).rows;
}

export async function getRepositoryContents() {
 const groups=await getContentServiceGroups();
 const rows=(await getPgPool().query(`SELECT c.*,cu.nombre_empresa AS nombre_cuenta,a.nombre_completo_agente,s.id_medio,
  (COALESCE(c.destino_revista,false) OR EXISTS(SELECT 1 FROM produccion_revistas_contenidos rc WHERE rc.id_contenido=c.id_contenido)
   OR EXISTS(SELECT 1 FROM servicios_publicaciones p WHERE p.revista_id IS NOT NULL AND p.revista_id<>'' AND p.id_publicacion IN (c.id_publicacion,c.contenido_especifico_id))
   OR COALESCE(c.publicacion_num_web,'') ~* '(VIDRIO|VENTANAS|VPCS|QQ|QUI.N ES QUI.N|HUECO).*(ESPA.A|IBERIA|LATAM|AM.RICA|N[ºO°]|[0-9]$)') AS es_revista,
  COALESCE(NULLIF(s.nombre_servicio_es,''),NULLIF(c.tipo_revista_servicio,''),c.servicio,'') AS nombre_servicio
  FROM produccion_contenidos c LEFT JOIN comercial_cuentas cu ON cu.id_cuenta=c.id_cuenta
  LEFT JOIN agentes_db a ON a.id_agente=c.id_agente LEFT JOIN servicios_db s ON s.id_servicio=c.servicio
  ORDER BY c.created_at DESC,c.id_contenido`)).rows;
 return rows.map(row=>{const id=contentServiceGroup(row);return {...row,grupo_servicio:id,nombre_grupo_servicio:groups.find(group=>group.id_medio===id)?.nombre_medio||id};});
}
export async function getRepositoryMaterials(contentId='') {
 return (await getPgPool().query(`SELECT m.*,COALESCE(m.id_contenido,c.id_contenido) AS id_contenido,c.nombre_contenido,c.estado_contenido,cu.nombre_empresa AS nombre_cuenta
  FROM produccion_materiales m LEFT JOIN LATERAL (SELECT c.* FROM produccion_contenidos c
   WHERE c.id_contenido=m.id_contenido OR (m.id_contenido IS NULL AND c.array_ids_materiales @> jsonb_build_array(m.id_material))
   ORDER BY c.id_contenido LIMIT 1) c ON true
  LEFT JOIN comercial_cuentas cu ON cu.id_cuenta=c.id_cuenta
  WHERE ($1='' OR m.id_contenido=$1 OR EXISTS(SELECT 1 FROM produccion_contenidos linked WHERE linked.id_contenido=$1 AND linked.array_ids_materiales @> jsonb_build_array(m.id_material)))
  ORDER BY m.es_version_acabada DESC,m.numero_version DESC NULLS LAST,m.created_at DESC,m.id_material`,[contentId])).rows;
}
