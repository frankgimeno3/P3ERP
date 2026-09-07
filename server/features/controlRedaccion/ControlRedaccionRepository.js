import { getPgPool } from '../../database/pgClient.js';

export async function getControlRedaccion() {
  const { rows } = await getPgPool().query(`
    SELECT id, prioridad, donde_esta, empresa, titulo, estado,
      responsable_correccion, revista, espana_previsto_numero,
      latam_previsto_numero, especial_numero, hueco_previsto, paginas,
      estado_publicacion_vidrioperfil
    FROM control_redaccion_db
    ORDER BY CASE prioridad WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 ELSE 4 END,
      empresa, id
  `);
  return rows;
}
