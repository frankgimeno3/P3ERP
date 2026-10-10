import { getPgPool } from '../../database/pgClient.js';
import {validateArticle,articleDisplayState,articlePublicationStatus} from '../../../app/config/editorialArticle.js';
import {allocateContentIdentifier} from '../identifiers/BusinessIdentifiers.js';
import {articleMatchesMagazine} from '../../../app/config/editorialMagazine.js';

const view=row=>({...row,empresa:row.nombre_cuenta||row.empresa,estado_original:row.estado,estado:articleDisplayState(row),publicaciones_estado:articlePublicationStatus(row)});
async function account(db,row){
 if(!row.id_cuenta)return;
 const found=(await db.query('SELECT nombre_empresa FROM comercial_cuentas WHERE id_cuenta=$1',[row.id_cuenta])).rows[0];
 if(!found)throw Object.assign(new Error('Selecciona una cuenta válida.'),{status:400});
 row.empresa=found.nombre_empresa;
}

export async function ensureArticleContent(db,article){
 if(article.id_contenido&&(await db.query('SELECT 1 FROM produccion_contenidos WHERE id_contenido=$1',[article.id_contenido])).rowCount)return article.id_contenido;
 const id=await allocateContentIdentifier(db);
 await db.query(`INSERT INTO produccion_contenidos
 (id_contenido,hoja_prod,cliente_hoja,nombre_contenido,tipo_contenido,especificaciones_contenido,estado_contenido,id_cuenta,tipo_revista_servicio,pagina_hoja)
 VALUES($1,true,$2,$3,'articulo',$3,$4,$5,'Revista',$6)`,[id,article.empresa,article.titulo,articleDisplayState(article),article.id_cuenta||null,article.paginas||'']);
 await db.query('UPDATE produccion_control_redaccion SET id_contenido=$1 WHERE id=$2',[id,article.id]);
 return id;
}

async function syncExtra(db,article){
 const contract=article.id_contrato_extra||'';
 // All writers serialize on the affected contract before changing the JSON collection.
 const previous=(await db.query(`SELECT id_contrato FROM comercial_contratos WHERE agregados_extra_post_contrato @> $1::jsonb ORDER BY id_contrato FOR UPDATE`,[JSON.stringify([article.id_contenido])])).rows;
 if(contract){
  const found=(await db.query('SELECT id_cuenta_contrato FROM comercial_contratos WHERE id_contrato=$1 FOR UPDATE',[contract])).rows[0];
  if(!found)throw Object.assign(new Error('Selecciona un contrato válido.'),{status:400});
  if(!article.id_cuenta||found.id_cuenta_contrato!==article.id_cuenta)throw Object.assign(new Error('El contrato extra debe pertenecer a la cuenta del artículo.'),{status:400});
 }
 for(const old of previous)if(old.id_contrato!==contract)await db.query(`UPDATE comercial_contratos SET agregados_extra_post_contrato=agregados_extra_post_contrato-$2,updated_at=now() WHERE id_contrato=$1`,[old.id_contrato,article.id_contenido]);
 if(contract)await db.query(`UPDATE comercial_contratos SET agregados_extra_post_contrato=CASE WHEN agregados_extra_post_contrato @> $2::jsonb THEN agregados_extra_post_contrato ELSE agregados_extra_post_contrato||$2::jsonb END,updated_at=now() WHERE id_contrato=$1`,[contract,JSON.stringify([article.id_contenido])]);
}

export async function getArticlesForMagazine(magazine,db=getPgPool()){
 return (await getControlRedaccion(db)).filter(article=>articleMatchesMagazine(article,magazine));
}

export async function createArticle(data,pool=getPgPool()) {
  const row=validateArticle(data);
  const db=typeof pool.release==='function' ? pool : await pool.connect();
  try {
    await db.query('BEGIN');
    await account(db,row);
    const columns=Object.keys(row),values=columns.map(c=>c==='publicaciones_estado'?JSON.stringify(row[c]):row[c]);
    const article=(await db.query(`INSERT INTO produccion_control_redaccion (${columns.join(',')}) VALUES (${columns.map((_,index)=>'$'+(index+1)).join(',')}) RETURNING *`,values)).rows[0];
    const idContenido=await ensureArticleContent(db,article);
    await syncExtra(db,{...article,id_contenido:idContenido});
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
  const contentId=await ensureArticleContent(db,updated);
  await db.query('UPDATE produccion_contenidos SET nombre_contenido=$2,especificaciones_contenido=$2,cliente_hoja=$3,estado_contenido=$4,id_cuenta=COALESCE($5,id_cuenta),pagina_hoja=$6,updated_at=now() WHERE id_contenido=$1',[contentId,row.titulo,row.empresa,row.estado,row.id_cuenta||null,row.paginas]);
  updated.id_contenido=contentId;await syncExtra(db,updated);
  await db.query('COMMIT');return view(updated);
 }catch(error){await db.query('ROLLBACK');throw error;}finally{if(db!==pool)db.release();}
}
