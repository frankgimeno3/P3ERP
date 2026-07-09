import { getPgPool } from "../../database/pgClient.js";

function normalizeRole(row) {
  return {
    id_rol: row.id_rol,
    nombre_rol: row.nombre_rol ?? "",
    descripcion_rol: row.descripcion_rol ?? "",
    permisos_rol: row.permisos_rol ?? [],
    accesos_personalizados: Boolean(row.accesos_personalizados),
    array_accesos_adicionales: row.array_accesos_adicionales ?? [],
    estado_rol: row.estado_rol ?? "",
  };
}

export async function getRoles() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    SELECT *
    FROM roles_db
    ORDER BY nombre_rol ASC, id_rol ASC
  `);

  return rows.map(normalizeRole);
}

export async function getRoleById(idRol) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      SELECT *
      FROM roles_db
      WHERE id_rol = $1
      LIMIT 1
    `,
    [idRol],
  );

  return rows[0] ? normalizeRole(rows[0]) : null;
}

export async function updateRolePermissions(idRol, permisos = [], accesosAdicionales = []) {
  const pool = getPgPool();
  const normalizedPermisos = Array.isArray(permisos) ? permisos : [];
  const normalizedAdicionales = Array.isArray(accesosAdicionales) ? accesosAdicionales : [];
  const { rows } = await pool.query(
    `
      UPDATE roles_db
      SET permisos_rol = $1::jsonb,
          accesos_personalizados = $2,
          array_accesos_adicionales = $3::jsonb,
          updated_at = NOW()
      WHERE id_rol = $4
      RETURNING *
    `,
    [JSON.stringify(normalizedPermisos), normalizedAdicionales.length > 0, JSON.stringify(normalizedAdicionales), idRol],
  );

  return rows[0] ? normalizeRole(rows[0]) : null;
}
