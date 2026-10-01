import { getPgPool } from '../../database/pgClient.js';
import {validateArticle} from '../../../app/config/editorialArticle.js';

export async function createArticle(data,pool=getPgPool()) {
  const row=validateArticle(data),columns=Object.keys(row);
  const db=typeof pool.release==='function' ? pool : await pool.connect();
  try {
    await db.query('BEGIN');
    const article=(await db.query(`INSERT INTO produccion_control_redaccion (${columns.join(',')}) VALUES (${columns.map((_,index)=>'$'+(index+1)).join(',')}) RETURNING *`,Object.values(row))).rows[0];
    const idContenido=`art_redaccion_${article.id}`;
    await db.query(`INSERT INTO produccion_contenidos
      (id_contenido,hoja_prod,cliente_hoja,nombre_contenido,tipo_contenido,especificaciones_contenido,estado_contenido)
      VALUES($1,true,$2,$3,'articulo',$3,$4)`, [idContenido,row.empresa,row.titulo,row.estado]);
    await db.query('UPDATE produccion_control_redaccion SET id_contenido=$1 WHERE id=$2',[idContenido,article.id]);
    await db.query('COMMIT');
    return {...article,id_contenido:idContenido};
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { if(db!==pool) db.release(); }
}

export async function getControlRedaccion() {
  const { rows } = await getPgPool().query(`
    SELECT id, prioridad, donde_esta, empresa, titulo, estado,
      responsable_correccion, revista, espana_previsto_numero,
      latam_previsto_numero, especial_numero, hueco_previsto, paginas,
      estado_publicacion_vidrioperfil
    FROM produccion_control_redaccion
    ORDER BY CASE prioridad WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 ELSE 4 END,
      empresa, id
  `);
  return rows;
}
