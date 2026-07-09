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
    accesos_personalizados: Boolean(row.accesos_personalizados),
    array_accesos_adicionales: row.array_accesos_adicionales ?? [],
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

export async function updateAgenteRoles(idAgente, data = {}) {
  const pool = getPgPool();
  const rolAgente = data.rol_agente === undefined ? null : data.rol_agente ?? "";
  const estadoAgente = data.estado_agente === undefined ? null : data.estado_agente ?? "";
  const accesosPersonalizados =
    data.accesos_personalizados === undefined ? null : Boolean(data.accesos_personalizados);
  const accesosAdicionales =
    data.array_accesos_adicionales === undefined
      ? null
      : JSON.stringify(Array.isArray(data.array_accesos_adicionales) ? data.array_accesos_adicionales : []);

  const { rows } = await pool.query(
    `
      UPDATE agentes_db
      SET rol_agente = COALESCE($1::text, rol_agente),
          estado_agente = COALESCE($2::text, estado_agente),
          accesos_personalizados = COALESCE($3::boolean, accesos_personalizados),
          array_accesos_adicionales = COALESCE($4::jsonb, array_accesos_adicionales),
          updated_at = NOW()
      WHERE id_agente = $5
      RETURNING *
    `,
    [rolAgente, estadoAgente, accesosPersonalizados, accesosAdicionales, idAgente],
  );

  return rows[0] ? normalizeAgente(rows[0]) : null;
}
