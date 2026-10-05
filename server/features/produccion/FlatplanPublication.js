import {getPgPool} from '../../database/pgClient.js';
import {flatplanRows,validateFlatplan} from '../../../app/lib/preliminaryFlatplan.js';
import {randomUUID} from 'node:crypto';
export async function publishFlatplan(id,version,apply=false,pool=getPgPool()) {
  const db=await pool.connect();
  try{
    await db.query('BEGIN');
    const book=(await db.query('SELECT plan,version FROM produccion_planillos_previos WHERE id_revista=$1 FOR UPDATE',[id])).rows[0];
    if(!book||book.version!==version)throw Object.assign(new Error('El planillo ha cambiado. Revisa la versión actual antes de publicar.'),{status:409});
    validateFlatplan(book.plan);
    const assigned=flatplanRows(book.plan).filter(row=>row.block?.contentId).map(row=>({contenido_id:row.block.contentId,numero_pagina:row.index-1,tipo_pagina:row.block.type,pagina_del_contenido:row.part,label:[row.block.account,row.block.detail].filter(Boolean).join(' · ')}));
    const before=(await db.query('SELECT contenido_id,numero_pagina,tipo_pagina,pagina_del_contenido FROM contenidos_revistas_db WHERE revista_id=$1 ORDER BY numero_pagina',[id])).rows;
    const comparable = rows => [...rows].sort((a,b)=>a.numero_pagina-b.numero_pagina).map(row=>[row.contenido_id,Number(row.numero_pagina),row.tipo_pagina,Number(row.pagina_del_contenido)]);
    const unchanged=JSON.stringify(comparable(before))===JSON.stringify(comparable(assigned));
    if(apply&&!unchanged){
      await db.query('DELETE FROM contenidos_revistas_db WHERE revista_id=$1',[id]);
      for(const row of assigned)await db.query('INSERT INTO contenidos_revistas_db(contenido_revista_id,revista_id,contenido_id,numero_pagina,tipo_pagina,pagina_del_contenido) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),id,row.contenido_id,row.numero_pagina,row.tipo_pagina,row.pagina_del_contenido]);
      await db.query('INSERT INTO produccion_planillos_publicaciones(id_revista,version,plan) VALUES($1,$2,$3::jsonb) ON CONFLICT DO NOTHING',[id,version,JSON.stringify(book.plan)]);
    }
    await db.query('COMMIT');return {version,before,after:assigned,emptyPages:book.plan.slots.filter(slot=>!slot).length,published:apply};
  }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
}
