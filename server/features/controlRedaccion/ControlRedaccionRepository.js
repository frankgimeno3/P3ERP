import { getPgPool } from '../../database/pgClient.js';
import {validateArticle,articleDisplayState,articlePublicationStatus} from '../../../app/config/editorialArticle.js';
import {allocateContentIdentifier} from '../identifiers/BusinessIdentifiers.js';

const view=row=>({...row,empresa:row.nombre_cuenta||row.empresa,estado_original:row.estado,estado:articleDisplayState(row),publicaciones_estado:articlePublicationStatus(row)});
async function account(db,row){
 if(!row.id_cuenta)return;
 const found=(await db.query('SELECT nombre_empresa FROM comercial_cuentas WHERE id_cuenta=$1',[row.id_cuenta])).rows[0];
 if(!found)throw Object.assign(new Error('Selecciona una cuenta válida.'),{status:400});
 row.empresa=found.nombre_empresa;
}

export async function createArticle(data,pool=getPgPool()) {
  const row=validateArticle(data);
  const db=typeof pool.release==='function' ? pool : await pool.connect();
  try {
    await db.query('BEGIN');
    await account(db,row);
    const columns=Object.keys(row),values=columns.map(c=>c==='publicaciones_estado'?JSON.stringify(row[c]):row[c]);
    const article=(await db.query(`INSERT INTO produccion_control_redaccion (${columns.join(',')}) VALUES (${columns.map((_,index)=>'$'+(index+1)).join(',')}) RETURNING *`,values)).rows[0];
    const idContenido=await allocateContentIdentifier(db);
    await db.query(`INSERT INTO produccion_contenidos
      (id_contenido,hoja_prod,cliente_hoja,nombre_contenido,tipo_contenido,especificaciones_contenido,estado_contenido,id_cuenta)
      VALUES($1,true,$2,$3,'articulo',$3,$4,$5)`, [idContenido,row.empresa,row.titulo,row.estado,row.id_cuenta||null]);
    await db.query('UPDATE produccion_control_redaccion SET id_contenido=$1 WHERE id=$2',[idContenido,article.id]);
    await db.query('COMMIT');
    return view({...article,id_contenido:idContenido});
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { if(db!==pool) db.release(); }
}

export async function getControlRedaccion(db=getPgPool()) {
  const { rows } = await db.query(`
    SELECT r.*,c.nombre_empresa nombre_cuenta
    FROM produccion_control_redaccion r LEFT JOIN comercial_cuentas c USING(id_cuenta)
    ORDER BY CASE r.prioridad WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 ELSE 4 END,
      r.empresa,r.id
  `);
  return rows.map(view);
}

export async function updateArticle(id,data,pool=getPgPool()){
 if(!/^\d+$/.test(String(id)))throw Object.assign(new Error('Artículo no válido.'),{status:400});
 const db=typeof pool.release==='function'?pool:await pool.connect();
 try{
  await db.query('BEGIN');
  const before=(await db.query('SELECT * FROM produccion_control_redaccion WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!before)throw Object.assign(new Error('Artículo no encontrado.'),{status:404});
  if(data.updated_at&&new Date(data.updated_at).getTime()!==new Date(before.updated_at).getTime())throw Object.assign(new Error('Otro usuario modificó este artículo. Recarga antes de guardar.'),{status:409});
  const row=validateArticle({...before,...data});await account(db,row);
  const columns=Object.keys(row),values=columns.map(c=>c==='publicaciones_estado'?JSON.stringify(row[c]):row[c]);
  const updated=(await db.query(`UPDATE produccion_control_redaccion SET ${columns.map((c,i)=>c+'=$'+(i+1)).join(',')},updated_at=now() WHERE id=$${columns.length+1} RETURNING *`,[...values,id])).rows[0];
  if(before.id_contenido)await db.query('UPDATE produccion_contenidos SET nombre_contenido=$2,cliente_hoja=$3,estado_contenido=$4,id_cuenta=COALESCE($5,id_cuenta),updated_at=now() WHERE id_contenido=$1',[before.id_contenido,row.titulo,row.empresa,row.estado,row.id_cuenta||null]);
  await db.query('COMMIT');return view(updated);
 }catch(error){await db.query('ROLLBACK');throw error;}finally{if(db!==pool)db.release();}
}
