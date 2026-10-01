import { getPgPool } from '../../database/pgClient.js';
const fail = (message, status=400) => { throw Object.assign(new Error(message), {status}); };
export async function getCanales() {
  return (await getPgPool().query('SELECT g.*, (SELECT count(*)::int FROM servicios_db s WHERE s.id_medio=g.id_medio) AS servicios FROM servicios_grupos_servicios g ORDER BY nombre_medio,id_medio')).rows;
}
export async function getCanal(id) {
  return (await getPgPool().query('SELECT * FROM servicios_grupos_servicios WHERE id_medio=$1',[id])).rows[0] || null;
}
export async function saveCanal(id,data,create=false) {
  const name=String(data.nombre_medio || '').trim();
  if(!name || name.length>200)fail('Indica un nombre de canal de hasta 200 caracteres.');
  if(!id || (create&&(!/^[\p{L}\p{N}_-]{1,100}$/u.test(id)||id==='crear')))fail('Usa un código de hasta 100 letras, números o guiones distinto de crear.');
  const result=create
    ? await getPgPool().query('INSERT INTO servicios_grupos_servicios(id_medio,nombre_medio) VALUES($1,$2) RETURNING *',[id,name])
    : await getPgPool().query('UPDATE servicios_grupos_servicios SET nombre_medio=$2,updated_at=now() WHERE id_medio=$1 RETURNING *',[id,name]);
  if(!result.rows[0])fail('Canal no encontrado.',404);
  return result.rows[0];
}
