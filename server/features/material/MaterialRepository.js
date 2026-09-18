import { randomUUID } from "node:crypto";
import { getPgPool } from "../../database/pgClient.js";

export async function getMateriales() {
  return (await getPgPool().query("SELECT * FROM produccion_materiales ORDER BY created_at DESC")).rows;
}

export async function getMaterial(idMaterial) {
  return (await getPgPool().query("SELECT * FROM produccion_materiales WHERE id_material=$1", [idMaterial])).rows[0] || null;
}

export async function saveMaterial(idMaterial, data = {}) {
  const materialId = idMaterial || data.id_material || `material_${randomUUID().slice(0, 12)}`;
  const { rows } = await getPgPool().query(
    `INSERT INTO produccion_materiales
      (id_material,nombre_material,validacion_produccion,comentarios,mediateca_id,archivo_url)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id_material) DO UPDATE SET
       nombre_material=EXCLUDED.nombre_material,
       validacion_produccion=EXCLUDED.validacion_produccion,
       comentarios=EXCLUDED.comentarios,
       mediateca_id=EXCLUDED.mediateca_id,
       archivo_url=EXCLUDED.archivo_url,
       updated_at=NOW()
     RETURNING *`,
    [materialId, data.nombre_material || "", data.validacion_produccion || "pendiente validar", data.comentarios || "", data.mediateca_id || null, data.archivo_url || null],
  );
  return rows[0];
}
