import { getPgPool } from "../../database/pgClient.js";
import { randomUUID } from "node:crypto";

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

export async function getAgenteByEmail(email) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `SELECT * FROM agentes_db WHERE lower(btrim(email_agente)) = lower(btrim($1)) ORDER BY updated_at DESC LIMIT 1`,
    [email],
  );
  return rows[0] ? normalizeAgente(rows[0]) : null;
}

export async function updateAgenteRoles(idAgente, data = {}) {
  const pool = getPgPool();
  const rolAgente = data.rol_agente === undefined ? null : (String(data.rol_agente || "").trim() || "base");
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

export async function emailAgenteExists(email, excludeId = "") {
  const pool = getPgPool();
  const { rowCount } = await pool.query(
    `SELECT 1 FROM agentes_db WHERE lower(btrim(email_agente)) = lower(btrim($1)) AND ($2 = '' OR id_agente <> $2) LIMIT 1`,
    [email, excludeId],
  );
  return rowCount > 0;
}

export async function nombreAgenteExists(nombre, excludeId = "") {
  const pool = getPgPool();
  const { rowCount } = await pool.query(
    `SELECT 1 FROM agentes_db WHERE lower(btrim(nombre_completo_agente)) = lower(btrim($1)) AND ($2 = '' OR id_agente <> $2) LIMIT 1`,
    [nombre, excludeId],
  );
  return rowCount > 0;
}

export async function createAgenteDraft(email) {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext(lower(btrim($1))))", [email]);
    const duplicate = await client.query(`SELECT 1 FROM agentes_db WHERE lower(btrim(email_agente)) = lower(btrim($1)) LIMIT 1`, [email]);
    if (duplicate.rowCount) {
      await client.query("ROLLBACK");
      return null;
    }
    const id = `ag_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
    const { rows } = await client.query(
      `INSERT INTO agentes_db (id_agente, email_agente, nombre_agente, apellidos_agente, nombre_completo_agente, rol_agente, estado_agente)
       VALUES ($1, lower(btrim($2)), '', '', '', 'base', 'borrador') RETURNING *`,
      [id, email],
    );
    await client.query("COMMIT");
    return normalizeAgente(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateAgenteDraft(idAgente, data = {}) {
  const pool = getPgPool();
  const fields = [];
  const values = [];
  if (data.email_agente !== undefined) { values.push(data.email_agente.trim().toLowerCase()); fields.push(`email_agente = $${values.length}`); }
  if (data.nombre_completo_agente !== undefined) { values.push(data.nombre_completo_agente.trim()); fields.push(`nombre_completo_agente = $${values.length}`, `nombre_agente = $${values.length}`); }
  if (!fields.length) return null;
  values.push(idAgente);
  const { rows } = await pool.query(
    `UPDATE agentes_db SET ${fields.join(", ")}, updated_at = NOW() WHERE id_agente = $${values.length} AND estado_agente = 'borrador' RETURNING *`,
    values,
  );
  return rows[0] ? normalizeAgente(rows[0]) : null;
}

export async function getAgenteDraft(idAgente) {
  const pool = getPgPool();
  const { rows } = await pool.query(`SELECT * FROM agentes_db WHERE id_agente = $1 AND estado_agente = 'borrador'`, [idAgente]);
  return rows[0] ? normalizeAgente(rows[0]) : null;
}

export async function confirmAgenteDraft(idAgente, roleId) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `UPDATE agentes_db SET rol_agente = $2, estado_agente = 'activo', updated_at = NOW() WHERE id_agente = $1 AND estado_agente = 'borrador' RETURNING *`,
    [idAgente, roleId],
  );
  return rows[0] ? normalizeAgente(rows[0]) : null;
}

export async function discardAgenteDraft(idAgente) {
  const pool = getPgPool();
  const result = await pool.query(`DELETE FROM agentes_db WHERE id_agente = $1 AND estado_agente = 'borrador'`, [idAgente]);
  return result.rowCount > 0;
}

export async function activeRoleExists(roleId) {
  const pool = getPgPool();
  const { rowCount } = await pool.query(`SELECT 1 FROM roles_db WHERE id_rol = $1 AND lower(COALESCE(estado_rol, 'activo')) = 'activo' LIMIT 1`, [roleId]);
  return rowCount > 0;
}

export async function deleteAgente(idAgente, beforeDelete) {
  const pool = getPgPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(`SELECT * FROM agentes_db WHERE id_agente = $1 FOR UPDATE`, [idAgente]);
    if (!rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    const agente = normalizeAgente(rows[0]);
    await beforeDelete(agente);
    await client.query(`DELETE FROM agentes_db WHERE id_agente = $1`, [idAgente]);
    await client.query("COMMIT");
    return {
      ...agente,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
