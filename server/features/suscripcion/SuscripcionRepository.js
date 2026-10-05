import { getPgPool } from "../../database/pgClient.js";

function numberOrNull(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function inferEstado(row, ultimoNumeroPublicado) {
  const numFinal = numberOrNull(row.num_final) ?? 0;
  const tieneContrato = Boolean(row.id_contrato);

  if (tieneContrato && (!row.revista || !row.edicion || ultimoNumeroPublicado === null)) return "sin_configurar";
  if (tieneContrato && ultimoNumeroPublicado >= numFinal) return "pendiente_renovar";
  if (tieneContrato) return "en_curso";
  return "anteriores";
}

function normalizeSuscripcion(row, ultimoNumeroPublicado) {
  const estado = inferEstado(row, ultimoNumeroPublicado);

  return {
    id_suscripcion: row.id_suscripcion,revista:row.revista||"",edicion:row.edicion||"",renovacion_propuesta_id:row.renovacion_propuesta_id||"",
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

export async function getSubscriptionCollections(pool=getPgPool()) {
 const {rows}=await pool.query(`SELECT r.revista,r.edicion,MAX(CASE WHEN lower(trim(p.estado_publicacion)) IN ('publicada','publicado','published') AND p.numero_publicacion ~ '^[0-9]+$' THEN p.numero_publicacion::int END) ultimo FROM servicios_revistas r LEFT JOIN servicios_publicaciones p ON p.revista_id=r.id_revista GROUP BY r.revista,r.edicion ORDER BY r.revista,r.edicion`);return rows;
}
async function getUltimoNumeroPublicado(pool,revista,edicion) {const collections=await getSubscriptionCollections(pool);return collections.find(c=>c.revista===revista&&c.edicion===edicion)?.ultimo??null;}

export async function getSuscripciones(filters = {}) {
  const pool = getPgPool();
  const collections = await getSubscriptionCollections(pool);
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
      FROM comercial_suscripciones s
      LEFT JOIN comercial_cuentas c ON c.id_cuenta = s.id_cuenta
      LEFT JOIN comercial_propuestas_db p ON p.id_propuesta = s.id_propuesta
      LEFT JOIN LATERAL (
        SELECT id_factura
        FROM tesoreria_ordenes
        WHERE id_contrato = s.id_contrato
        ORDER BY id_orden ASC
        LIMIT 1
      ) o ON true
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY s.num_final ASC NULLS LAST, s.id_suscripcion ASC
    `,
    values,
  );

  const suscripciones = rows.map((row) => normalizeSuscripcion(row, collections.find(c=>c.revista===row.revista&&c.edicion===row.edicion)?.ultimo??null));

  if (filters.estado) {
    return suscripciones.filter((suscripcion) => suscripcion.estado === filters.estado);
  }

  return suscripciones;
}

export async function createSuscripcion(data = {}) {
  const pool = getPgPool();
  const first=Number(data.num_inicial),last=Number(data.num_final);
  if(!Number.isInteger(first)||!Number.isInteger(last)||first<1||last<first)throw Object.assign(new Error('Indica un primer y último número válidos para la suscripción.'),{status:400});
  if(!data.id_cuenta)throw Object.assign(new Error('Selecciona la cuenta del suscriptor.'),{status:400});
  if(!data.revista||!data.edicion||!(await getSubscriptionCollections(pool)).some(c=>c.revista===data.revista&&c.edicion===data.edicion))throw Object.assign(new Error("Selecciona una revista y edicion validas."),{status:400});
  const idSuscripcion = data.id_suscripcion?.trim() || `sus_${Date.now()}`;
  const { rows } = await pool.query(
    `
      INSERT INTO comercial_suscripciones (
        id_suscripcion,
        id_cuenta,
        id_propuesta,
        id_contrato,
        num_inicial,
        num_final,revista,edicion
      )
      VALUES ($1, $2, $3, $4, $5, $6,$7,$8)
      RETURNING *
    `,
    [
      idSuscripcion,
      data.id_cuenta || null,
      data.id_propuesta || "",
      data.id_contrato || "",
      numberOrNull(data.num_inicial),
      numberOrNull(data.num_final),data.revista,data.edicion,
    ],
  );

  const ultimoNumeroPublicado = await getUltimoNumeroPublicado(pool,data.revista,data.edicion);
  const { rows: joinedRows } = await pool.query(
    `
      SELECT s.*, c.nombre_empresa, p.nombre_propuesta, '' AS id_factura
      FROM comercial_suscripciones s
      LEFT JOIN comercial_cuentas c ON c.id_cuenta = s.id_cuenta
      LEFT JOIN comercial_propuestas_db p ON p.id_propuesta = s.id_propuesta
      WHERE s.id_suscripcion = $1
    `,
    [rows[0].id_suscripcion],
  );

  return normalizeSuscripcion(joinedRows[0],ultimoNumeroPublicado);
}
