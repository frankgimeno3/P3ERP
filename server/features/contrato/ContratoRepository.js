import { getPgPool } from "../../database/pgClient.js";

function numberOrZero(value) {
  return value === null || value === undefined ? 0 : Number(value);
}

function normalizeOrden(row) {
  return {
    id_orden: row.id_orden,
    id_contrato: row.id_contrato ?? "",
    forma_cobro: row.forma_cobro ?? "",
    id_factura: row.id_factura ?? "",
    numero_cobro: row.numero_cobro ?? null,
    etiqueta_cobro: row.etiqueta_cobro ?? "",
    fecha_teorica_cobro: row.fecha_teorica_cobro ?? "",
    fecha_real_cobro: row.fecha_real_cobro ?? "",
    banco_cobro: row.banco_cobro ?? "",
    base_imponible: numberOrZero(row.base_imponible),
    cobro_total: numberOrZero(row.cobro_total),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeLinea(row) {
  return {
    id_linea_contrato: row.id_linea_contrato,
    numero_linea_contrato: row.numero_linea_contrato,
    id_publicacion: row.id_publicacion ?? "",
    medio: row.medio ?? "",
    publicacion: row.publicacion ?? "",
    producto: row.producto ?? "",
    precio_producto: numberOrZero(row.precio_producto),
    deadline_publicacion: row.deadline_publicacion ?? "",
    fecha_publicacion_publicacion: row.fecha_publicacion_publicacion ?? "",
    estado_material_contrato: row.estado_material_contrato ?? "",
    url_contenido: row.url_contenido ?? "",
    array_id_contenidos: row.array_id_contenidos ?? [],
  };
}

function normalizeContrato(row) {
  return {
    id_contrato: row.id_contrato,
    id_agente_contrato: row.id_agente_contrato ?? "",
    nombre_agente_contrato: row.nombre_agente_contrato ?? "",
    fecha_cobro_prevista_contrato: row.fecha_cobro_prevista_contrato ?? "",
    forma_cobro_contrato: row.forma_cobro_contrato ?? "",
    fecha_firma_contrato: row.fecha_firma_contrato ?? "",
    fecha_fin_contrato: row.fecha_fin_contrato ?? "",
    id_propuesta: row.id_propuesta ?? "",
    descuento_final_contrato: numberOrZero(row.descuento_final_contrato),
    importe_total_bi_contrato: numberOrZero(row.importe_total_bi_contrato),
    iva_aplicable: Boolean(row.iva_aplicable),
    importe_contrato_con_iva: numberOrZero(row.importe_contrato_con_iva),
    id_cuenta_contrato: row.id_cuenta_contrato ?? "",
    nombre_empresa: row.nombre_empresa ?? "",
    id_contacto_contrato: row.id_contacto_contrato ?? "",
    nombre_contacto: row.nombre_contacto ?? "",
    cargo_contacto_contrato: row.cargo_contacto_contrato ?? "",
    array_contenidos: row.array_contenidos ?? [],
    array_id_ordenes: row.array_id_ordenes ?? [],
    lineas_contrato: row.lineas_contrato ?? [],
    ordenes: row.ordenes ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const baseSelect = `
  SELECT
    c.*,
    a.nombre_completo_agente AS nombre_agente_contrato,
    cu.nombre_empresa,
    co.nombre_completo_contacto AS nombre_contacto
  FROM contratos_db c
  LEFT JOIN agentes_db a ON a.id_agente = c.id_agente_contrato
  LEFT JOIN cuentas_db cu ON cu.id_cuenta = c.id_cuenta_contrato
  LEFT JOIN contactos_db co ON co.id_contacto = c.id_contacto_contrato
`;

export async function getContratos() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    ${baseSelect}
    ORDER BY to_date(NULLIF(c.fecha_firma_contrato, ''), 'DD/MM/YYYY') DESC NULLS LAST, c.created_at DESC
  `);

  return rows.map(normalizeContrato);
}

export async function getContratoById(idContrato) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      ${baseSelect}
      WHERE c.id_contrato = $1
      LIMIT 1
    `,
    [idContrato],
  );

  if (!rows[0]) return null;

  const [lineas, ordenes] = await Promise.all([
    pool.query(
      `
        SELECT *
        FROM lineas_contratos_db
        WHERE id_contrato = $1
        ORDER BY numero_linea_contrato ASC NULLS LAST, id_linea_contrato ASC
      `,
      [idContrato],
    ),
    pool.query(
      `
        SELECT *
        FROM ordenes_db
        WHERE id_contrato = $1
        ORDER BY id_orden ASC
      `,
      [idContrato],
    ),
  ]);

  return normalizeContrato({
    ...rows[0],
    lineas_contrato: lineas.rows.map(normalizeLinea),
    ordenes: ordenes.rows.map(normalizeOrden),
  });
}

export async function updateContrato(idContrato, data = {}) {
  const pool = getPgPool();
  const agentId = String(data.id_agente_contrato ?? "").trim();

  if (agentId) {
    const agent = await pool.query(
      "SELECT 1 FROM agentes_db WHERE id_agente=$1 LIMIT 1",
      [agentId],
    );
    if (!agent.rowCount) throw new Error("El agente seleccionado no existe");
  }

  const { rowCount } = await pool.query(
    `UPDATE contratos_db
     SET id_agente_contrato=$1,
         updated_at=NOW()
     WHERE id_contrato=$2`,
    [agentId, idContrato],
  );
  if (!rowCount) return null;

  await pool.query(
    `UPDATE contenidos_db
     SET id_agente=$1,updated_at=NOW()
     WHERE id_contrato=$2`,
    [agentId || null, idContrato],
  );

  return getContratoById(idContrato);
}
