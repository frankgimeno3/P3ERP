import { getPgPool } from "../../database/pgClient.js";

function normalizeFeria(row) {
  return {
    id_feria: row.id_feria,
    titulo_especifico_edicion: row.titulo_especifico_edicion ?? "",
    nombre_feria: row.nombre_feria ?? "",
    id_cuenta_feria: row.id_cuenta_feria ?? "",
    id_cuenta_gestion: row.id_cuenta_gestion ?? "",
    pais: row.pais ?? "",
    ciudad: row.ciudad ?? "",
    edicion_numero: row.edicion_numero ?? "",
    hay_intercambio: Boolean(row.hay_intercambio),
    id_contrato: row.id_contrato ?? "",
    hay_especial: Boolean(row.hay_especial),
    descripcion: row.descripcion ?? "",
    text_area_comentarios: row.text_area_comentarios ?? "",
    estado_vuelos: row.estado_vuelos ?? "",
    estado_hotel: row.estado_hotel ?? "",
    estado_stand: row.estado_stand ?? "",
    estado_material: row.estado_material ?? "",
    estado_transporte_revistas: row.estado_transporte_revistas ?? "",
    estado_pases: row.estado_pases ?? "",
    textarea_gestion_evento: row.textarea_gestion_evento ?? "",
    fecha_incio: row.fecha_incio ?? "",
    fecha_finalizacion: row.fecha_finalizacion ?? "",
    en_vidrioperfil: Boolean(row.en_vidrioperfil),
    id_revista_especial: row.id_revista_especial ?? "",
    id_propuesta_intercambio: row.id_propuesta_intercambio ?? "",
    estado_intercambio: row.estado_intercambio ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getFerias() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    SELECT *
    FROM ferias_db
    ORDER BY to_date(NULLIF(fecha_finalizacion, ''), 'DD/MM/YYYY') ASC NULLS LAST, nombre_feria ASC, id_feria ASC
  `);

  return rows.map(normalizeFeria);
}

export async function getFeriaById(idFeria) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      SELECT *
      FROM ferias_db
      WHERE id_feria = $1
      LIMIT 1
    `,
    [idFeria],
  );

  return rows[0] ? normalizeFeria(rows[0]) : null;
}

export async function createFeria(data = {}) {
  const pool = getPgPool();
  const idFeria = data.id_feria?.trim() || `feria_${Date.now()}`;
  const { rows } = await pool.query(
    `
      INSERT INTO ferias_db (
        id_feria,
        titulo_especifico_edicion,
        nombre_feria,
        pais,
        ciudad,
        edicion_numero,
        fecha_incio,
        fecha_finalizacion,
        hay_intercambio,
        id_contrato,
        hay_especial,
        en_vidrioperfil,
        descripcion,
        id_revista_especial,
        id_propuesta_intercambio,
        estado_intercambio
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `,
    [
      idFeria,
      data.titulo_especifico_edicion || "",
      data.nombre_feria || "",
      data.pais || "",
      data.ciudad || "",
      data.edicion_numero || "",
      data.fecha_incio || "",
      data.fecha_finalizacion || "",
      Boolean(data.hay_intercambio),
      data.id_contrato || "",
      Boolean(data.hay_especial),
      Boolean(data.en_vidrioperfil),
      data.descripcion || "",
      data.id_revista_especial || "",
      data.id_propuesta_intercambio || "",
      data.estado_intercambio || "",
    ],
  );

  return normalizeFeria(rows[0]);
}
