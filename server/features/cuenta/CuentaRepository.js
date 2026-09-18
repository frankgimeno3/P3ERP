import { getPgPool } from "../../database/pgClient.js";
import { addCuentaEvento, formatChangeDetail } from "../registroEventos/RegistroEventosRepository.js";

const tableName = "comercial_cuentas";

const writableColumns = [
  "id_cuenta",
  "nombre_empresa",
  "pais_cuenta",
  "id_agente",
  "website",
  "id_edisoft",
  "asignado_a",
  "receptor_revista",
  "suscriptor_revista",
  "potencial_actual_relacion",
  "potencial_futuro_encaje",
  "revisado_ricardo",
  "campanas",
  "estado_leads_frios",
  "stands_ferias",
  "tipo_cuenta",
  "descripcion_cuenta",
  "actividades_cuenta",
  "descripcion_actividad",
  "correo_principal",
  "qq",
  "presente_en_qq",
  "ferias",
  "red_social_prioritaria",
  "catalogos",
  "array_cuentas_distribuidoras",
  "array_cuentas_distribuidas",
  "cuenta_agencia",
  "fuente_novedades_cuenta",
  "vat_code",
  "identificador_fiscal_tipo",
  "cif",
  "nombre_fiscal",
  "pais_facturacion",
  "direccion_facturacion",
  "mail_contabilidad",
  "poblacion_facturacion",
  "cp_facturacion",
  "detalles_facturacion",
  "facturas_emitidas",
  "datos_comerciales",
  "array_direcciones_cuenta",
  "array_contactos_cuenta",
  "array_comentarios_cuenta",
  "comentarios_gm",
];

const jsonColumns = new Set([
  "datos_comerciales",
  "ferias",
  "array_cuentas_distribuidoras",
  "array_cuentas_distribuidas",
  "facturas_emitidas",
  "array_direcciones_cuenta",
  "array_contactos_cuenta",
  "array_comentarios_cuenta",
]);

function normalizeCuenta(row) {
  return {
    id_cuenta: row.id_cuenta,
    nombre_empresa: row.nombre_empresa ?? "",
    pais_cuenta: row.pais_cuenta ?? "",
    id_agente: row.id_agente ?? "",
    website: row.website ?? "",
    id_edisoft: row.id_edisoft ?? "",
    asignado_a: row.asignado_a ?? "",
    receptor_revista: Boolean(row.receptor_revista),
    suscriptor_revista: Boolean(row.suscriptor_revista),
    potencial_actual_relacion: row.potencial_actual_relacion ?? "",
    potencial_futuro_encaje: row.potencial_futuro_encaje ?? "",
    revisado_ricardo: Boolean(row.revisado_ricardo),
    campanas: row.campanas ?? "",
    estado_leads_frios: row.estado_leads_frios ?? "",
    stands_ferias: row.stands_ferias ?? "",
    tipo_cuenta: row.tipo_cuenta ?? "",
    descripcion_cuenta: row.descripcion_cuenta ?? "",
    actividades_cuenta: row.actividades_cuenta ?? "",
    descripcion_actividad: row.descripcion_actividad ?? "",
    correo_principal: row.correo_principal ?? "",
    qq: Boolean(row.qq),
    presente_en_qq: Boolean(row.presente_en_qq),
    ferias: Array.isArray(row.ferias) ? row.ferias : [],
    red_social_prioritaria: row.red_social_prioritaria ?? "",
    catalogos: row.catalogos ?? "",
    array_cuentas_distribuidoras: row.array_cuentas_distribuidoras ?? [],
    array_cuentas_distribuidas: row.array_cuentas_distribuidas ?? [],
    cuenta_agencia: row.cuenta_agencia ?? "",
    fuente_novedades_cuenta: row.fuente_novedades_cuenta ?? "",
    vat_code: row.vat_code ?? "",
    identificador_fiscal_tipo: row.identificador_fiscal_tipo ?? "",
    cif: row.cif ?? "",
    nombre_fiscal: row.nombre_fiscal ?? "",
    pais_facturacion: row.pais_facturacion ?? "",
    direccion_facturacion: row.direccion_facturacion ?? "",
    mail_contabilidad: row.mail_contabilidad ?? "",
    poblacion_facturacion: row.poblacion_facturacion ?? "",
    cp_facturacion: row.cp_facturacion ?? "",
    detalles_facturacion: row.detalles_facturacion ?? "",
    facturas_emitidas: row.facturas_emitidas ?? [],
    datos_comerciales: row.datos_comerciales ?? {},
    array_direcciones_cuenta: row.array_direcciones_cuenta ?? [],
    array_contactos_cuenta: row.array_contactos_cuenta ?? [],
    array_comentarios_cuenta: row.array_comentarios_cuenta ?? [],
    comentarios_gm: row.comentarios_gm ?? "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeValue(column, value) {
  if (jsonColumns.has(column)) {
    if (value === undefined || value === null) return JSON.stringify(column === "datos_comerciales" ? {} : []);
    if (column === "datos_comerciales") return JSON.stringify(value && typeof value === "object" ? value : {});
    return JSON.stringify(Array.isArray(value) ? value : []);
  }

  if (["presente_en_qq", "qq", "receptor_revista", "suscriptor_revista", "revisado_ricardo"].includes(column)) {
    return Boolean(value);
  }

  return value;
}

export async function getCuentas(filters = {}) {
  const pool = getPgPool();
  const values = [];
  const where = [];

  if (filters.clienteFiltro) {
    values.push(`%${filters.clienteFiltro}%`);
    where.push(`nombre_empresa ILIKE $${values.length}`);
  }

  if (filters.codigoCrmFiltro) {
    values.push(`%${filters.codigoCrmFiltro}%`);
    where.push(`id_cuenta ILIKE $${values.length}`);
  }

  if (filters.agenteFiltro) {
    values.push(filters.agenteFiltro);
    where.push(`id_agente = $${values.length}`);
  }

  if (filters.telFiltro) {
    values.push(`%${filters.telFiltro}%`);
    where.push(`datos_comerciales::text ILIKE $${values.length}`);
  }

  if (filters.paisFiltro) {
    values.push(`%${filters.paisFiltro}%`);
    where.push(`pais_cuenta ILIKE $${values.length}`);
  }

  const query = `
    SELECT *
    FROM ${tableName}
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY created_at DESC
  `;

  const { rows } = await pool.query(query, values);
  return rows.map(normalizeCuenta);
}

export async function getCuentaById(idCuenta) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `SELECT * FROM ${tableName} WHERE id_cuenta = $1 LIMIT 1`,
    [idCuenta],
  );

  return rows[0] ? normalizeCuenta(rows[0]) : null;
}

export async function createCuenta(cuentaData) {
  const pool = getPgPool();
  const columns = writableColumns.filter((column) => cuentaData[column] !== undefined);
  const values = columns.map((column) => normalizeValue(column, cuentaData[column]));
  const placeholders = columns.map((column, index) => {
    const placeholder = `$${index + 1}`;
    return jsonColumns.has(column) ? `${placeholder}::jsonb` : placeholder;
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `
        INSERT INTO ${tableName} (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
        RETURNING *
      `,
      values,
    );

    const created = normalizeCuenta(rows[0]);
    const actor = cuentaData._id_agente || cuentaData.id_agente || "";
    await addCuentaEvento({
      idCuenta: created.id_cuenta,
      idAgente: actor,
      eventType: actor ? "Cambio por agente" : "Acción automatizada",
      detalles: `el usuario ${actor || "sistema"}, ha creado esta cuenta`,
    }, client);

    await client.query("COMMIT");
    return created;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateCuenta(idCuenta, cuentaData) {
  const pool = getPgPool();
  const before = await getCuentaById(idCuenta);
  const columns = writableColumns.filter((column) => column !== "id_cuenta" && cuentaData[column] !== undefined);
  const values = columns.map((column) => normalizeValue(column, cuentaData[column]));

  if (!columns.length) {
    return getCuentaById(idCuenta);
  }

  values.push(idCuenta);
  const assignments = columns.map((column, index) => {
    const placeholder = `$${index + 1}`;
    return jsonColumns.has(column) ? `${column} = ${placeholder}::jsonb` : `${column} = ${placeholder}`;
  });

  const { rows } = await pool.query(
    `
      UPDATE ${tableName}
      SET ${assignments.join(", ")}, updated_at = NOW()
      WHERE id_cuenta = $${values.length}
      RETURNING *
    `,
    values,
  );

  const updated = rows[0] ? normalizeCuenta(rows[0]) : null;

  if (before && updated) {
    const actor = cuentaData._id_agente || cuentaData.id_last_editor || cuentaData.id_agente || "";
    await Promise.allSettled(
      columns
        .filter((column) => JSON.stringify(before[column] ?? "") !== JSON.stringify(updated[column] ?? ""))
        .map((column) => addCuentaEvento({
          idCuenta,
          idAgente: actor,
          eventType: actor ? "Cambio por agente" : "Acción automatizada",
          detalles: formatChangeDetail(actor, column, before[column], updated[column]),
        })),
    );
  }

  return updated;
}

export async function deleteCuenta(idCuenta, actor = "") {
  const pool = getPgPool();
  const before = await getCuentaById(idCuenta);
  const { rows } = await pool.query(
    `DELETE FROM ${tableName} WHERE id_cuenta = $1 RETURNING *`,
    [idCuenta],
  );
  if (before && rows[0]) {
    await addCuentaEvento({
      idCuenta,
      idAgente: actor,
      eventType: actor ? "Cambio por agente" : "AcciÃ³n automatizada",
      detalles: `el usuario ${actor || "sistema"}, ha eliminado la cuenta ${idCuenta}`,
    }).catch(() => {});
  }
  return rows[0] ? normalizeCuenta(rows[0]) : null;
}
