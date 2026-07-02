import { getPgPool } from "../../database/pgClient.js";

function normalizePropuesta(row) {
  return {
    id_propuesta: row.id_propuesta,
    id_agente_propuesta: row.id_agente_propuesta ?? "",
    estado_propuesta: row.estado_propuesta ?? "",
    fecha_envio_propuesta: row.fecha_envio_propuesta ?? "",
    nombre_propuesta: row.nombre_propuesta ?? "",
    forma_cobro_propuesta: row.forma_cobro_propuesta ?? "",
    descuento_final_propuesta: Number(row.descuento_final_propuesta ?? 0),
    importe_total_bi_propuesta: Number(row.importe_total_bi_propuesta ?? 0),
    iva_aplicable: Boolean(row.iva_aplicable),
    importe_propuesta_con_iva: Number(row.importe_propuesta_con_iva ?? 0),
    id_cuenta_propuesta: row.id_cuenta_propuesta ?? "",
    id_contacto_propuesta: row.id_contacto_propuesta ?? "",
    cargo_contacto_propuesta: row.cargo_contacto_propuesta ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getPropuestas(filters = {}) {
  const pool = getPgPool();
  const values = [];
  const where = [];

  if (filters.idCuenta) {
    values.push(filters.idCuenta);
    where.push(`id_cuenta_propuesta = $${values.length}`);
  }

  if (filters.estado) {
    values.push(filters.estado);
    where.push(`estado_propuesta = $${values.length}`);
  }

  const { rows } = await pool.query(
    `
      SELECT *
      FROM propuestas_db
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY
        to_date(NULLIF(fecha_envio_propuesta, ''), 'DD/MM/YYYY') DESC NULLS LAST,
        created_at DESC
    `,
    values,
  );

  return rows.map(normalizePropuesta);
}
