import {changeProductionMaterial} from "../produccion/ProductionMaterialTrash.js";
import { getPgPool } from "../../database/pgClient.js";

export async function getMateriales() {
  return (await getPgPool().query("SELECT * FROM produccion_materiales WHERE eliminado_at IS NULL ORDER BY created_at DESC")).rows;
}

export async function getMaterial(idMaterial) {
  return (await getPgPool().query(`SELECT m.*,COALESCE(m.id_contenido,c.id_contenido) AS id_contenido,c.nombre_contenido,c.estado_contenido
    FROM produccion_materiales m LEFT JOIN LATERAL (SELECT c.id_contenido,c.nombre_contenido,c.estado_contenido FROM produccion_contenidos c
      WHERE c.id_contenido=m.id_contenido OR (m.id_contenido IS NULL AND c.array_ids_materiales @> jsonb_build_array(m.id_material))
      ORDER BY c.id_contenido LIMIT 1) c ON true WHERE m.id_material=$1`, [idMaterial])).rows[0] || null;
}

export async function saveMaterial(idMaterial,data={}){
 if(!idMaterial)throw Object.assign(new Error('Los materiales se crean desde la ficha del contenido mediante una subida verificada.'),{status:405});
 const material=await getMaterial(idMaterial);
 if(!material?.id_contenido)throw Object.assign(new Error('El material no está asociado a un contenido.'),{status:409});
 return changeProductionMaterial(material.id_contenido,{accion:'editar',id_material:idMaterial,version:data.version||data.updated_at,nombre_material:data.nombre_material,descripcion_material:data.descripcion_material??material.descripcion_material});
}
