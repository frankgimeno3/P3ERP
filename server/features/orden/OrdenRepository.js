import { getPgPool } from "../../database/pgClient.js";

function numberOrZero(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

function normalizeOrden(row) {
  return {
    id_orden: row.id_orden,
    numero_cobro: row.numero_cobro,
    etiqueta_cobro: row.etiqueta_cobro ?? "",
    fecha_teorica_cobro: row.fecha_teorica_cobro ?? "",
    fecha_real_cobro: row.fecha_real_cobro ?? "",
    forma_cobro: row.forma_cobro ?? "",
    banco_cobro: row.banco_cobro ?? "",
    cobrada: Boolean(row.cobrada),
    ya_contabilizada: Boolean(row.ya_contabilizada),
    base_imponible: numberOrZero(row.base_imponible),
    cobro_total: numberOrZero(row.cobro_total),
    id_contrato: row.id_contrato ?? "",
    id_factura: row.id_factura ?? "",
    cliente: row.nombre_empresa || row.id_cuenta_contrato || "",
    agente: row.nombre_completo_agente || row.id_agente_contrato || "",
  };
}

const ordenesSelect = `
  SELECT
    o.id_orden,
    o.numero_cobro,
    o.etiqueta_cobro,
    o.fecha_teorica_cobro,
    o.fecha_real_cobro,
    o.forma_cobro,
    o.banco_cobro,
    o.cobrada,
    COALESCE(o.base_imponible, c.importe_total_bi_contrato) AS base_imponible,
    COALESCE(o.cobro_total, c.importe_contrato_con_iva) AS cobro_total,
    o.id_contrato,
    o.id_factura,
    c.id_cuenta_contrato,
    c.id_agente_contrato,
    cu.nombre_empresa,
    a.nombre_completo_agente,
    f.ya_contabilizada
  FROM ordenes_db o
  LEFT JOIN contratos_db c ON c.id_contrato = o.id_contrato
  LEFT JOIN cuentas_db cu ON cu.id_cuenta = c.id_cuenta_contrato
  LEFT JOIN agentes_db a ON a.id_agente = c.id_agente_contrato
  LEFT JOIN facturas_clientes_db f ON f.id_factura_cliente = o.id_factura
`;

export async function getOrdenesAdministrativas(filters = {}) {
  const pool = getPgPool();
  const values = [];
  const where = [];

  if (filters.search) {
    values.push(`%${String(filters.search).trim()}%`);
    where.push(`
      (
        o.id_orden ILIKE $${values.length}
        OR o.id_factura ILIKE $${values.length}
        OR o.id_contrato ILIKE $${values.length}
        OR cu.nombre_empresa ILIKE $${values.length}
        OR a.nombre_completo_agente ILIKE $${values.length}
        OR o.forma_cobro ILIKE $${values.length}
        OR o.banco_cobro ILIKE $${values.length}
      )
    `);
  }

  const { rows } = await pool.query(
    `
      ${ordenesSelect}
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY o.created_at DESC, o.id_orden ASC
    `,
    values,
  );

  return rows.map(normalizeOrden);
}

export async function getOrdenAdministrativaById(idOrden) {
  const pool = getPgPool();
  const { rows } = await pool.query(`${ordenesSelect} WHERE o.id_orden = $1 LIMIT 1`, [idOrden]);
  return rows[0] ? normalizeOrden(rows[0]) : null;
}

export async function getPrevisionIngresosOrdenes(tipo) {
  const pool = getPgPool();
  const normalizedTipo = String(tipo || "").toLowerCase();
  const values = [];
  const where = [];

  if (normalizedTipo === "recibos") {
    where.push("o.forma_cobro ILIKE '%recibo%'");
  }

  if (normalizedTipo === "transfers") {
    where.push("(o.forma_cobro ILIKE '%transfer%' OR o.forma_cobro ILIKE '%transf%')");
  }

  const { rows } = await pool.query(
    `
      ${ordenesSelect}
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY
        to_date(NULLIF(o.fecha_teorica_cobro, ''), 'DD/MM/YYYY') ASC NULLS LAST,
        o.id_orden ASC
    `,
    values,
  );

  return rows.map(normalizeOrden);
}
