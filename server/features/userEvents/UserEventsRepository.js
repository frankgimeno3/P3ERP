import {getPgPool} from '../../database/pgClient.js';
const error=(message,status=422)=>Object.assign(new Error(message),{status});
export async function getUserEvents(filters,db=getPgPool()){
 const params=[],where=[];
 const add=(sql,value)=>{params.push(value);where.push(sql.replaceAll('?',`$${params.length}`));};
 for(const field of ['usuario','ip','descripcion'])if(filters.get(field)?.trim())add(`${field} ILIKE ?`,'%'+filters.get(field).trim().slice(0,300)+'%');
 if(filters.get('tipo')){if(!['crear','editar','borrar'].includes(filters.get('tipo')))throw error('Tipo de evento no válido.');add('tipo=?',filters.get('tipo'));}
 if(filters.get('tabla'))add('tabla=?',filters.get('tabla').slice(0,200));
 if(filters.get('solicitud')){const id=filters.get('solicitud');if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))throw error('Solicitud no válida.');add('id_solicitud=?::uuid',id);}
 for(const field of ['desde','hasta'])if(filters.get(field)){
  const date=filters.get(field);if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date)throw error('Fecha de filtro no válida.');
  add(field==='desde'?"fecha >= (?::date::timestamp AT TIME ZONE 'Europe/Madrid')":"fecha < ((?::date+1)::timestamp AT TIME ZONE 'Europe/Madrid')",date);
 }
 const condition=where.length?'WHERE '+where.join(' AND '):'';
 const page=Math.max(1,Math.min(100000,Math.trunc(Number(filters.get('pagina'))||1)));
 const count=(await db.query(`SELECT count(*)::int total FROM eventos_de_usuarios ${condition}`,params)).rows[0].total;
 const rows=(await db.query(`SELECT id,fecha,to_char(fecha AT TIME ZONE 'Europe/Madrid','DD/MM/YYYY HH24:MI:SS') fecha_hora,usuario,tipo,tabla,descripcion,ip,origen_ip FROM eventos_de_usuarios ${condition} ORDER BY fecha DESC,id DESC LIMIT 100 OFFSET $${params.length+1}`,[...params,(page-1)*100])).rows;
 const tables=(await db.query("SELECT c.relname tabla,EXISTS(SELECT 1 FROM pg_trigger t WHERE t.tgrelid=c.oid AND t.tgname='p3_user_events_row') cubierta FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relispartition AND c.relname<>'eventos_de_usuarios' ORDER BY c.relname")).rows;
 const entities=(await db.query('SELECT DISTINCT tabla FROM eventos_de_usuarios ORDER BY tabla')).rows.map(r=>r.tabla);
 return {rows,total:count,pagina:page,tablas:[...new Set([...tables.map(t=>t.tabla),...entities])].sort(),sin_cobertura:tables.filter(t=>!t.cubierta).map(t=>t.tabla)};
}
export async function getUserEvent(id,db=getPgPool()){
 if(!/^\d+$/.test(String(id)))throw error('Evento no válido.');
 const row=(await db.query("SELECT *,to_char(fecha AT TIME ZONE 'Europe/Madrid','DD/MM/YYYY HH24:MI:SS') fecha_hora FROM eventos_de_usuarios WHERE id=$1",[id])).rows[0];
 if(!row)throw error('Evento no encontrado.',404);
 const related=(await db.query('SELECT id,tabla,tipo,clave,descripcion,datos_anteriores,datos_nuevos FROM eventos_de_usuarios WHERE id_solicitud=$1 AND id<>$2 ORDER BY id LIMIT 100',[row.id_solicitud,id])).rows;
 const summary=(await db.query('SELECT tabla,tipo,count(*)::int cantidad FROM eventos_de_usuarios WHERE id_solicitud=$1 AND id<>$2 GROUP BY tabla,tipo ORDER BY tabla,tipo',[row.id_solicitud,id])).rows;
 const removed=summary.filter(s=>s.tipo==='borrar');
 return {...row,relacionados:related,resumen_solicitud:summary,descripcion_completa:row.descripcion+(row.tipo==='borrar'&&removed.length?' En esta misma solicitud se borraron además: '+removed.map(s=>`${s.cantidad} registro(s) de ${s.tabla}`).join('; ')+'.':'')};
}
