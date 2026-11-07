import {getPgPool} from '../../database/pgClient.js';
import {articleMatchesMagazine} from '../../../app/config/editorialMagazine.js';
// Compatibility reads are projections of canonical contents. Historical rows are never edited.
export async function getControlRedaccion(db=getPgPool()){
 const rows=(await db.query(`SELECT r.*,c.nombre_empresa nombre_cuenta,pc.formato_revista FROM produccion_articulos_contenidos r
 LEFT JOIN comercial_cuentas c USING(id_cuenta) JOIN produccion_contenidos pc ON pc.id_contenido=r.id_contenido ORDER BY r.id`)).rows;
 return rows.map(row=>({...row,empresa:row.nombre_cuenta||row.empresa}));
}
export async function getArticlesForMagazine(magazine,db=getPgPool()){return (await getControlRedaccion(db)).filter(row=>articleMatchesMagazine(row,magazine));}
