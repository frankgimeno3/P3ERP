import { getPgPool } from "../../database/pgClient.js";

function normalizeServicio(row) {
  return {
    id_servicio: row.id_servicio,
    id_medio: row.id_medio ?? "",
    nombre_medio: row.nombre_medio ?? "",
    ano_servicio: row.ano_servicio ?? "",
    soporte_servicio: row.soporte_servicio ?? "",
    precio_servicio: row.precio_servicio ?? "",
    precio_tarifa: row.precio_tarifa === null || row.precio_tarifa === undefined ? null : Number(row.precio_tarifa),
    fecha_deadline_servicio: row.fecha_deadline_servicio ?? "",
    fecha_publicacion_servicio: row.fecha_publicacion_servicio ?? "",
    concepto_factura: row.concepto_factura ?? "",
    medio_servicio_es: row.medio_servicio_es ?? "",
    edicion_servicio_es: row.edicion_servicio_es ?? "",
    publicacion_servicio_es: row.publicacion_servicio_es ?? "",
    nombre_servicio_es: row.nombre_servicio_es ?? "",
    medio_servicio_en: row.medio_servicio_en ?? "",
    edicion_servicio_en: row.edicion_servicio_en ?? "",
    publicacion_servicio_en: row.publicacion_servicio_en ?? "",
    nombre_servicio_en: row.nombre_servicio_en ?? "",
  };
}

export async function getServicios(filters = {}) {
  const pool = getPgPool();
  const values = [];
  const where = [];

  if (filters.idMedio) {
    values.push(filters.idMedio);
    where.push(`s.id_medio = $${values.length}`);
  }

  if (filters.medio) {
    values.push(`%${filters.medio}%`);
    where.push(`(s.medio_servicio_es ILIKE $${values.length} OR g.nombre_medio ILIKE $${values.length})`);
  }

  if (filters.publicacion) {
    values.push(`%${filters.publicacion}%`);
    where.push(`s.publicacion_servicio_es ILIKE $${values.length}`);
  }

  if (filters.servicio) {
    values.push(`%${filters.servicio}%`);
    where.push(`(s.nombre_servicio_es ILIKE $${values.length} OR s.id_servicio ILIKE $${values.length})`);
  }

  const { rows } = await pool.query(
    `
      SELECT s.*, g.nombre_medio
      FROM servicios_db s
      LEFT JOIN grupos_servicios g ON g.id_medio = s.id_medio
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY s.id_medio ASC, s.medio_servicio_es ASC, s.publicacion_servicio_es ASC, s.nombre_servicio_es ASC
    `,
    values,
  );

  return rows.map(normalizeServicio);
}

export async function getServicioById(idServicio) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      SELECT s.*, g.nombre_medio
      FROM servicios_db s
      LEFT JOIN grupos_servicios g ON g.id_medio = s.id_medio
      WHERE s.id_servicio = $1
      LIMIT 1
    `,
    [idServicio],
  );

  return rows[0] ? normalizeServicio(rows[0]) : null;
}
