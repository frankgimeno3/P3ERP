import { getPgPool } from "../../database/pgClient.js";

function normalizeAgente(row) {
  return {
    id_agente: row.id_agente,
    nombre_agente: row.nombre_agente ?? "",
    apellidos_agente: row.apellidos_agente ?? "",
    nombre_completo_agente: row.nombre_completo_agente ?? "",
    email_agente: row.email_agente ?? "",
    DNI_agente: row.dni_agente ?? "",
    rol_agente: row.rol_agente ?? "",
    estado_agente: row.estado_agente ?? "",
  };
}

export async function getAgentes() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    SELECT *
    FROM agentes_db
    ORDER BY nombre_completo_agente ASC
  `);

  return rows.map(normalizeAgente);
}
