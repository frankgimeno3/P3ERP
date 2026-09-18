import { getPgPool } from "../../database/pgClient.js";
import crypto from "node:crypto";

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
    nombre_espanol: row.nombre_espanol || row.nombre_servicio_es || row.id_servicio,
    nombre_ingles: row.nombre_ingles || row.nombre_servicio_en || row.nombre_servicio_es || row.id_servicio,
    nombre_italiano: row.nombre_italiano || row.nombre_servicio_es || row.id_servicio,
    nombre_portugues: row.nombre_portugues || row.nombre_servicio_es || row.id_servicio,
    medio_servicio_it: row.medio_servicio_it ?? "",
    edicion_servicio_it: row.edicion_servicio_it ?? "",
    publicacion_servicio_it: row.publicacion_servicio_it ?? "",
    nombre_servicio_it: row.nombre_servicio_it ?? "",
    medio_servicio_pt: row.medio_servicio_pt ?? "",
    edicion_servicio_pt: row.edicion_servicio_pt ?? "",
    publicacion_servicio_pt: row.publicacion_servicio_pt ?? "",
    nombre_servicio_pt: row.nombre_servicio_pt ?? "",
    disponibilidad: row.disponibilidad || "Ofrecible",
    comentarios: row.comentarios ?? "",
  };
}

export async function getServicios(filters = {}) {
  const pool = getPgPool();
  await pool.query(`ALTER TABLE servicios_db ADD COLUMN IF NOT EXISTS nombre_espanol TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS nombre_ingles TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS nombre_italiano TEXT NOT NULL DEFAULT '', ADD COLUMN IF NOT EXISTS nombre_portugues TEXT NOT NULL DEFAULT ''`);
  await pool.query(`UPDATE servicios_db SET nombre_espanol=COALESCE(NULLIF(nombre_espanol,''),NULLIF(nombre_servicio_es,''),id_servicio), nombre_ingles=COALESCE(NULLIF(nombre_ingles,''),NULLIF(nombre_servicio_en,''),NULLIF(nombre_servicio_es,''),id_servicio), nombre_italiano=COALESCE(NULLIF(nombre_italiano,''),NULLIF(nombre_servicio_es,''),id_servicio), nombre_portugues=COALESCE(NULLIF(nombre_portugues,''),NULLIF(nombre_servicio_es,''),id_servicio) WHERE nombre_espanol='' OR nombre_ingles='' OR nombre_italiano='' OR nombre_portugues=''`);
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
      LEFT JOIN servicios_grupos_servicios g ON g.id_medio = s.id_medio
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
      LEFT JOIN servicios_grupos_servicios g ON g.id_medio = s.id_medio
      WHERE s.id_servicio = $1
      LIMIT 1
    `,
    [idServicio],
  );

  return rows[0] ? normalizeServicio(rows[0]) : null;
}

const editableColumns = ["id_medio", "ano_servicio", "soporte_servicio", "precio_servicio", "precio_tarifa", "concepto_factura", "fecha_deadline_servicio", "fecha_publicacion_servicio", "medio_servicio_es", "edicion_servicio_es", "publicacion_servicio_es", "nombre_servicio_es", "medio_servicio_en", "edicion_servicio_en", "publicacion_servicio_en", "nombre_servicio_en", "medio_servicio_it", "edicion_servicio_it", "publicacion_servicio_it", "nombre_servicio_it", "medio_servicio_pt", "edicion_servicio_pt", "publicacion_servicio_pt", "nombre_servicio_pt", "disponibilidad", "comentarios"];

export async function saveServicio(idServicio, data = {}) {
  const pool = getPgPool();
  const columns = editableColumns.filter((column) => data[column] !== undefined);
  if (!columns.length) return getServicioById(idServicio);
  const values = columns.map((column) => data[column] ?? "");
  values.push(idServicio);
  await pool.query(`UPDATE servicios_db SET ${columns.map((column, index) => `${column}=$${index + 1}`).join(", ")}, updated_at=NOW() WHERE id_servicio=$${values.length}`, values);
  return getServicioById(idServicio);
}

export async function createServicio(data = {}) {
  const pool = getPgPool();
  const id = String(data.id_servicio || "").trim();
  if (!id) throw new Error("El código único del servicio es obligatorio");
  const columns = ["id_servicio", ...editableColumns.filter((column) => data[column] !== undefined)];
  const values = [id, ...columns.slice(1).map((column) => data[column] ?? "")];
  await pool.query(`INSERT INTO servicios_db (${columns.join(", ")}) VALUES (${values.map((_, index) => `$${index + 1}`).join(", ")})`, values);
  return getServicioById(id);
}

export async function createPublicationOption(data = {}) {
  const pool = getPgPool();
  const required = ["es", "en", "it", "pt"];
  for (const language of required) {
    if (!String(data.medio?.[language] || "").trim() || !String(data.edicion?.[language] || "").trim() || !String(data.publicacion?.[language] || "").trim()) throw new Error("Medio, edición y publicación son obligatorios en los cuatro idiomas");
  }
  const id = `publ_srv_${crypto.randomUUID()}`;
  await pool.query(`INSERT INTO servicios_publicaciones (id_publicacion,nombre_publicacion,estado_publicacion,medio_publicacion,edicion_publicacion,detalle_publicacion,medio_publicacion_es,medio_publicacion_en,medio_publicacion_it,medio_publicacion_pt,edicion_publicacion_es,edicion_publicacion_en,edicion_publicacion_it,edicion_publicacion_pt,detalle_publicacion_es,detalle_publicacion_en,detalle_publicacion_it,detalle_publicacion_pt) VALUES ($1,$2,'Pendiente',$3,$4,$5,$3,$6,$7,$8,$4,$9,$10,$11,$5,$12,$13,$14)`, [id, `${data.medio.es} · ${data.edicion.es} · ${data.publicacion.es}`, data.medio.es, data.edicion.es, data.publicacion.es, data.medio.en, data.medio.it, data.medio.pt, data.edicion.en, data.edicion.it, data.edicion.pt, data.publicacion.en, data.publicacion.it, data.publicacion.pt]);
  return { id_publicacion: id };
}
