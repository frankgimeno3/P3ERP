import { getPgPool } from "../../database/pgClient.js";

function normalizeContacto(row) {
  return {
    id_contacto: row.id_contacto,
    id_cuenta: row.id_cuenta ?? "",
    nombre_contacto: row.nombre_contacto ?? "",
    apellidos_contacto: row.apellidos_contacto ?? "",
    nombre_completo_contacto: row.nombre_completo_contacto ?? "",
    nombre_empresa: row.nombre_empresa ?? "",
    telefono_contacto: row.telefono_contacto ?? "",
    email_contacto: row.email_contacto ?? "",
    cargo_contacto: row.cargo_contacto ?? "",
    idiomas: row.idiomas ?? "",
    conocido_en: row.conocido_en ?? "",
    contactado_en_feria: row.contactado_en_feria ?? "",
    suscripciones: row.suscripciones ?? [],
    otros_datos_interes: row.otros_datos_interes ?? "",
    pais_contacto: row.pais_contacto ?? "",
  };
}

export async function getContactos(filters = {}) {
  const pool = getPgPool();
  const values = [];
  const where = [];

  if (filters.idCuenta) {
    values.push(filters.idCuenta);
    where.push(`id_cuenta = $${values.length}`);
  }

  const { rows } = await pool.query(
    `
      SELECT *
      FROM contactos_db
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY nombre_completo_contacto ASC
    `,
    values,
  );

  return rows.map(normalizeContacto);
}

export async function unlinkContactoFromCuenta(idContacto, idCuenta) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      UPDATE contactos_db
      SET id_cuenta = NULL,
          nombre_empresa = COALESCE(NULLIF(nombre_empresa, ''), nombre_empresa),
          updated_at = NOW()
      WHERE id_contacto = $1
        AND ($2::text = '' OR id_cuenta = $2)
      RETURNING *
    `,
    [idContacto, idCuenta || ""],
  );

  return rows[0] ? normalizeContacto(rows[0]) : null;
}

export async function deleteContacto(idContacto) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      DELETE FROM contactos_db
      WHERE id_contacto = $1
      RETURNING *
    `,
    [idContacto],
  );

  return rows[0] ? normalizeContacto(rows[0]) : null;
}
