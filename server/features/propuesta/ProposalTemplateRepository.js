import { getPgPool } from '../../database/pgClient.js';

const languages = new Set(['es','en','it','pt']);
function validate(data) {
  const nombre = String(data.nombre || '').trim();
  const versions = data.versiones;
  if (!nombre) throw new Error('La plantilla necesita un nombre');
  if (!versions || typeof versions !== 'object' || !Array.isArray(versions.es) || !versions.es.length) throw new Error('Debes introducir productos en español');
  for (const [language,lines] of Object.entries(versions)) {
    if (!languages.has(language) || !Array.isArray(lines) || !lines.length) throw new Error('Idioma o líneas no válidos');
    for (const line of lines) {
      if (!line || typeof line !== 'object' || !String(line.id_servicio || '').trim()) throw new Error('Cada línea necesita un servicio');
    }
  }
  return { nombre, versions };
}
export async function listProposalTemplates() {
  return (await getPgPool().query(`SELECT id_plantilla,nombre,versiones,created_at,updated_at
    FROM comercial_propuestas_plantillas ORDER BY updated_at DESC`)).rows;
}
export async function getProposalTemplate(id) {
  return (await getPgPool().query('SELECT * FROM comercial_propuestas_plantillas WHERE id_plantilla=$1',[id])).rows[0] || null;
}
export async function createProposalTemplate(data) {
  const { nombre,versions } = validate(data);
  return (await getPgPool().query(`INSERT INTO comercial_propuestas_plantillas(nombre,versiones)
    VALUES($1,$2::jsonb) RETURNING *`,[nombre,JSON.stringify(versions)])).rows[0];
}
export async function updateProposalTemplate(id,data) {
  const { nombre,versions } = validate(data);
  return (await getPgPool().query(`UPDATE comercial_propuestas_plantillas SET nombre=$2,versiones=$3::jsonb,updated_at=now()
    WHERE id_plantilla=$1 RETURNING *`,[id,nombre,JSON.stringify(versions)])).rows[0] || null;
}
