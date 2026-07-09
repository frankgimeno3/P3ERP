import { getPgPool } from "../../database/pgClient.js";

function numberOrNull(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferEstado(row, ultimoNumeroPublicado) {
  const numFinal = numberOrNull(row.num_final) ?? 0;
  const tieneContrato = Boolean(row.id_contrato);

  if (tieneContrato && ultimoNumeroPublicado >= numFinal) return "pendiente_renovar";
  if (tieneContrato) return "en_curso";
  return "anteriores";
}

function normalizeSuscripcion(row, ultimoNumeroPublicado) {
  const estado = inferEstado(row, ultimoNumeroPublicado);

  return {
    id_suscripcion: row.id_suscripcion,
    id_cuenta: row.id_cuenta ?? "",
    nombre_empresa: row.nombre_empresa ?? "",
    id_propuesta: row.id_propuesta ?? "",
    nombre_propuesta: row.nombre_propuesta ?? "",
    id_contrato: row.id_contrato ?? "",
    id_factura: row.id_factura ?? "",
    num_inicial: numberOrNull(row.num_inicial),
    num_final: numberOrNull(row.num_final),
    ultimo_numero_publicado: ultimoNumeroPublicado,
    estado,
    carta: buildCarta(row, estado),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function buildCarta(row, estado) {
  const nombre = row.nombre_empresa || "cliente";
  const rango = `${row.num_inicial || "-"}-${row.num_final || "-"}`;

  if (estado === "pendiente_renovar") {
    return `Estimado ${nombre}, su suscripción a la revista ha llegado al número ${row.num_final}. Adjuntamos propuesta de renovación para continuar recibiendo los próximos números.`;
  }

  if (estado === "en_curso") {
    return `Estimado ${nombre}, su suscripción está activa para los números ${rango}. Le mantendremos informado de cada envío.`;
  }

  return `Estimado ${nombre}, la suscripción anterior para los números ${rango} ha finalizado.`;
}

async function getUltimoNumeroPublicado(pool) {
  const { rows } = await pool.query(`
    WITH revistas AS (
      SELECT
        (regexp_match(concat_ws(' ', nombre_publicacion, edicion_publicacion), '\\d+'))[1]::int AS numero,
        lower(coalesce(estado_publicacion, '')) AS estado
      FROM publicaciones_db
      WHERE lower(coalesce(medio_publicacion, '')) LIKE '%revista%'
        AND regexp_match(concat_ws(' ', nombre_publicacion, edicion_publicacion), '\\d+') IS NOT NULL
    )
    SELECT coalesce(
      max(numero) FILTER (WHERE estado LIKE '%public%'),
      max(numero),
      0
    ) AS ultimo
    FROM revistas
  `);

  return numberOrNull(rows[0]?.ultimo) ?? 0;
}

export async function getSuscripciones(filters = {}) {
  const pool = getPgPool();
  const ultimoNumeroPublicado = await getUltimoNumeroPublicado(pool);
  const values = [];
  const where = [];

  if (filters.id_cuenta) {
    values.push(filters.id_cuenta);
    where.push(`s.id_cuenta = $${values.length}`);
  }

  const { rows } = await pool.query(
    `
      SELECT
        s.*,
        c.nombre_empresa,
        p.nombre_propuesta,
        o.id_factura
      FROM suscripciones_db s
      LEFT JOIN cuentas_db c ON c.id_cuenta = s.id_cuenta
      LEFT JOIN propuestas_db p ON p.id_propuesta = s.id_propuesta
      LEFT JOIN LATERAL (
        SELECT id_factura
        FROM ordenes_db
        WHERE id_contrato = s.id_contrato
        ORDER BY id_orden ASC
        LIMIT 1
      ) o ON true
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY s.num_final ASC NULLS LAST, s.id_suscripcion ASC
    `,
    values,
  );

  const suscripciones = rows.map((row) => normalizeSuscripcion(row, ultimoNumeroPublicado));

  if (filters.estado) {
    return suscripciones.filter((suscripcion) => suscripcion.estado === filters.estado);
  }

  return suscripciones;
}

export async function createSuscripcion(data = {}) {
  const pool = getPgPool();
  const idSuscripcion = data.id_suscripcion?.trim() || `sus_${Date.now()}`;
  const { rows } = await pool.query(
    `
      INSERT INTO suscripciones_db (
        id_suscripcion,
        id_cuenta,
        id_propuesta,
        id_contrato,
        num_inicial,
        num_final
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      idSuscripcion,
      data.id_cuenta || null,
      data.id_propuesta || "",
      data.id_contrato || "",
      numberOrNull(data.num_inicial),
      numberOrNull(data.num_final),
    ],
  );

  const ultimoNumeroPublicado = await getUltimoNumeroPublicado(pool);
  const { rows: joinedRows } = await pool.query(
    `
      SELECT s.*, c.nombre_empresa, p.nombre_propuesta, '' AS id_factura
      FROM suscripciones_db s
      LEFT JOIN cuentas_db c ON c.id_cuenta = s.id_cuenta
      LEFT JOIN propuestas_db p ON p.id_propuesta = s.id_propuesta
      WHERE s.id_suscripcion = $1
    `,
    [rows[0].id_suscripcion],
  );

  return normalizeSuscripcion(joinedRows[0], ultimoNumeroPublicado);
}
