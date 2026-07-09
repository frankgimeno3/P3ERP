import crypto from "node:crypto";
import { getPgPool } from "../../database/pgClient.js";

const propuestaColumns = [
  "id_propuesta",
  "id_agente_propuesta",
  "estado_propuesta",
  "fase_propuesta",
  "fecha_envio_propuesta",
  "fecha_validez_propuesta",
  "nombre_propuesta",
  "comentarios_adicionales",
  "forma_cobro_propuesta",
  "descuento_final_propuesta",
  "importe_total_bi_propuesta",
  "iva_aplicable",
  "importe_propuesta_con_iva",
  "id_cuenta_propuesta",
  "id_contacto_propuesta",
  "cargo_contacto_propuesta",
  "datos_facturacion",
  "contacto_personalizado",
];

const jsonColumns = new Set(["datos_facturacion", "contacto_personalizado"]);

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asJson(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

function normalizePropuesta(row, lineas = [], cobros = [], cuenta = null, contacto = null) {
  return {
    id_propuesta: row.id_propuesta,
    id_agente_propuesta: row.id_agente_propuesta ?? "",
    estado_propuesta: row.estado_propuesta ?? "",
    fase_propuesta: row.fase_propuesta ?? "1",
    fecha_envio_propuesta: row.fecha_envio_propuesta ?? "",
    fecha_validez_propuesta: row.fecha_validez_propuesta ?? "",
    nombre_propuesta: row.nombre_propuesta ?? "",
    comentarios_adicionales: row.comentarios_adicionales ?? "",
    forma_cobro_propuesta: row.forma_cobro_propuesta ?? "",
    descuento_final_propuesta: asNumber(row.descuento_final_propuesta),
    importe_total_bi_propuesta: asNumber(row.importe_total_bi_propuesta),
    iva_aplicable: Boolean(row.iva_aplicable),
    importe_propuesta_con_iva: asNumber(row.importe_propuesta_con_iva),
    id_cuenta_propuesta: row.id_cuenta_propuesta ?? "",
    id_contacto_propuesta: row.id_contacto_propuesta ?? "",
    cargo_contacto_propuesta: row.cargo_contacto_propuesta ?? "",
    datos_facturacion: asJson(row.datos_facturacion, {}),
    contacto_personalizado: asJson(row.contacto_personalizado, null),
    lineas,
    cobros,
    cuenta,
    contacto,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeLinea(row) {
  return {
    id_linea_propuesta: row.id_linea_propuesta,
    id_propuesta: row.id_propuesta ?? "",
    numero_linea_propuesta: row.numero_linea_propuesta ?? 0,
    id_servicio: row.id_servicio ?? "",
    id_publicacion: row.id_publicacion ?? "",
    medio: row.medio ?? "",
    publicacion: row.publicacion ?? "",
    producto: row.producto ?? "",
    precio_tarifa: asNumber(row.precio_tarifa),
    descuento_producto: asNumber(row.descuento_producto),
    precio_unitario: asNumber(row.precio_unitario),
    unidades: asNumber(row.unidades, 1),
    descripcion_linea: row.descripcion_linea ?? "",
    deadline_publicacion: row.deadline_publicacion ?? "",
    fecha_publicacion_publicacion: row.fecha_publicacion_publicacion ?? "",
  };
}

function normalizeCobro(row) {
  return {
    id_cobro_propuesta: row.id_cobro_propuesta,
    id_propuesta: row.id_propuesta ?? "",
    numero_cobro: row.numero_cobro ?? 0,
    fecha_cobro: row.fecha_cobro ?? "",
    importe_cobro: asNumber(row.importe_cobro),
    forma_cobro: row.forma_cobro ?? "",
    banco_cobro: row.banco_cobro ?? "",
    observaciones_cobro: row.observaciones_cobro ?? "",
  };
}

function normalizeCuenta(row) {
  if (!row) return null;
  return {
    id_cuenta: row.id_cuenta,
    nombre_empresa: row.nombre_empresa ?? "",
    pais_cuenta: row.pais_cuenta ?? "",
    id_agente: row.id_agente ?? "",
    vat_code: row.vat_code ?? "",
    nombre_fiscal: row.nombre_fiscal ?? "",
    pais_facturacion: row.pais_facturacion ?? "",
    direccion_facturacion: row.direccion_facturacion ?? "",
    mail_contabilidad: row.mail_contabilidad ?? "",
    poblacion_facturacion: row.poblacion_facturacion ?? "",
    cp_facturacion: row.cp_facturacion ?? "",
    detalles_facturacion: row.detalles_facturacion ?? "",
  };
}

function normalizeContacto(row) {
  if (!row) return null;
  return {
    id_contacto: row.id_contacto,
    id_cuenta: row.id_cuenta ?? "",
    nombre_completo_contacto: row.nombre_completo_contacto ?? "",
    email_contacto: row.email_contacto ?? "",
    cargo_contacto: row.cargo_contacto ?? "",
    telefono_contacto: row.telefono_contacto ?? "",
  };
}

function normalizeInputValue(column, value) {
  if (jsonColumns.has(column)) return JSON.stringify(value ?? (column === "contacto_personalizado" ? null : {}));
  if (column === "iva_aplicable") return Boolean(value);
  if (["descuento_final_propuesta", "importe_total_bi_propuesta", "importe_propuesta_con_iva"].includes(column)) {
    return asNumber(value);
  }
  return value ?? "";
}

function generateId(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function loadProposalExtras(client, proposalIds) {
  if (!proposalIds.length) return { lineasById: new Map(), cobrosById: new Map() };

  const [lineasResult, cobrosResult] = await Promise.all([
    client.query(
      `
        SELECT *
        FROM lineas_propuestas_db
        WHERE id_propuesta = ANY($1::text[])
        ORDER BY id_propuesta ASC, numero_linea_propuesta ASC, created_at ASC
      `,
      [proposalIds],
    ),
    client.query(
      `
        SELECT *
        FROM cobros_propuestas_db
        WHERE id_propuesta = ANY($1::text[])
        ORDER BY id_propuesta ASC, numero_cobro ASC, created_at ASC
      `,
      [proposalIds],
    ),
  ]);

  const lineasById = new Map(proposalIds.map((id) => [id, []]));
  for (const row of lineasResult.rows) {
    const id = row.id_propuesta;
    if (!lineasById.has(id)) lineasById.set(id, []);
    lineasById.get(id).push(normalizeLinea(row));
  }

  const cobrosById = new Map(proposalIds.map((id) => [id, []]));
  for (const row of cobrosResult.rows) {
    const id = row.id_propuesta;
    if (!cobrosById.has(id)) cobrosById.set(id, []);
    cobrosById.get(id).push(normalizeCobro(row));
  }

  return { lineasById, cobrosById };
}

export async function getPropuestas(filters = {}) {
  const pool = getPgPool();
  const values = [];
  const where = [];

  if (filters.idCuenta) {
    values.push(filters.idCuenta);
    where.push(`p.id_cuenta_propuesta = $${values.length}`);
  }

  if (filters.estado) {
    values.push(filters.estado);
    where.push(`p.estado_propuesta = $${values.length}`);
  }

  if (filters.agente) {
    values.push(filters.agente);
    where.push(`p.id_agente_propuesta = $${values.length}`);
  }

  if (filters.cliente) {
    values.push(`%${filters.cliente}%`);
    where.push(`c.nombre_empresa ILIKE $${values.length}`);
  }

  if (filters.codigoCrm) {
    values.push(`%${filters.codigoCrm}%`);
    where.push(`p.id_cuenta_propuesta ILIKE $${values.length}`);
  }

  const { rows } = await pool.query(
    `
      SELECT p.*, c.nombre_empresa
      FROM propuestas_db p
      LEFT JOIN cuentas_db c ON c.id_cuenta = p.id_cuenta_propuesta
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY
        NULLIF(p.fecha_envio_propuesta, '') DESC NULLS LAST,
        p.created_at DESC
    `,
    values,
  );

  const ids = rows.map((row) => row.id_propuesta);
  const { lineasById, cobrosById } = await loadProposalExtras(pool, ids);
  return rows.map((row) =>
    normalizePropuesta(row, lineasById.get(row.id_propuesta) ?? [], cobrosById.get(row.id_propuesta) ?? [], {
      id_cuenta: row.id_cuenta_propuesta ?? "",
      nombre_empresa: row.nombre_empresa ?? "",
    }),
  );
}

export async function getPropuestaById(idPropuesta) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      SELECT p.*, c.*, ct.id_contacto, ct.nombre_completo_contacto, ct.email_contacto, ct.cargo_contacto, ct.telefono_contacto
      FROM propuestas_db p
      LEFT JOIN cuentas_db c ON c.id_cuenta = p.id_cuenta_propuesta
      LEFT JOIN contactos_db ct ON ct.id_contacto = p.id_contacto_propuesta
      WHERE p.id_propuesta = $1
      LIMIT 1
    `,
    [idPropuesta],
  );

  if (!rows[0]) return null;
  const { lineasById, cobrosById } = await loadProposalExtras(pool, [idPropuesta]);
  return normalizePropuesta(
    rows[0],
    lineasById.get(idPropuesta) ?? [],
    cobrosById.get(idPropuesta) ?? [],
    normalizeCuenta(rows[0]),
    normalizeContacto(rows[0].id_contacto ? rows[0] : null),
  );
}

async function replaceLineas(client, idPropuesta, lineas = []) {
  await client.query(`ALTER TABLE lineas_propuestas_db ADD COLUMN IF NOT EXISTS id_publicacion TEXT`);
  await client.query("DELETE FROM lineas_propuestas_db WHERE id_propuesta = $1", [idPropuesta]);
  for (let index = 0; index < lineas.length; index += 1) {
    const linea = lineas[index] ?? {};
    await client.query(
      `
        INSERT INTO lineas_propuestas_db (
          id_linea_propuesta,
          id_propuesta,
          numero_linea_propuesta,
          id_servicio,
          id_publicacion,
          medio,
          publicacion,
          producto,
          precio_tarifa,
          descuento_producto,
          precio_unitario,
          unidades,
          descripcion_linea,
          deadline_publicacion,
          fecha_publicacion_publicacion
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `,
      [
        linea.id_linea_propuesta || generateId("linprop"),
        idPropuesta,
        Number(linea.numero_linea_propuesta ?? index + 1),
        linea.id_servicio ?? "",
        linea.id_publicacion ?? linea.publicacion_id ?? "",
        linea.medio ?? "",
        linea.publicacion ?? "",
        linea.producto ?? "",
        asNumber(linea.precio_tarifa),
        asNumber(linea.descuento_producto),
        asNumber(linea.precio_unitario),
        asNumber(linea.unidades, 1),
        linea.descripcion_linea ?? "",
        linea.deadline_publicacion ?? "",
        linea.fecha_publicacion_publicacion ?? "",
      ],
    );
  }
}

async function replaceCobros(client, idPropuesta, cobros = []) {
  await client.query("DELETE FROM cobros_propuestas_db WHERE id_propuesta = $1", [idPropuesta]);
  for (let index = 0; index < cobros.length; index += 1) {
    const cobro = cobros[index] ?? {};
    await client.query(
      `
        INSERT INTO cobros_propuestas_db (
          id_cobro_propuesta,
          id_propuesta,
          numero_cobro,
          fecha_cobro,
          importe_cobro,
          forma_cobro,
          banco_cobro,
          observaciones_cobro
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `,
      [
        cobro.id_cobro_propuesta || generateId("cobprop"),
        idPropuesta,
        Number(cobro.numero_cobro ?? index + 1),
        cobro.fecha_cobro ?? "",
        asNumber(cobro.importe_cobro),
        cobro.forma_cobro ?? "",
        cobro.banco_cobro ?? "",
        cobro.observaciones_cobro ?? "",
      ],
    );
  }
}

export async function createPropuesta(payload) {
  const pool = getPgPool();
  const client = await pool.connect();
  const idPropuesta = payload.id_propuesta || generateId("prop");

  try {
    await client.query("BEGIN");
    const data = {
      id_propuesta: idPropuesta,
      estado_propuesta: "Borrador",
      fase_propuesta: "1",
      ...payload,
      id_propuesta: idPropuesta,
    };
    const columns = propuestaColumns.filter((column) => data[column] !== undefined);
    const values = columns.map((column) => normalizeInputValue(column, data[column]));
    const placeholders = columns.map((column, index) => (jsonColumns.has(column) ? `$${index + 1}::jsonb` : `$${index + 1}`));

    await client.query(
      `
        INSERT INTO propuestas_db (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
      `,
      values,
    );
    await replaceLineas(client, idPropuesta, payload.lineas ?? []);
    await replaceCobros(client, idPropuesta, payload.cobros ?? []);
    await client.query("COMMIT");
    return getPropuestaById(idPropuesta);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updatePropuesta(idPropuesta, payload) {
  const pool = getPgPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const columns = propuestaColumns.filter((column) => column !== "id_propuesta" && payload[column] !== undefined);
    if (columns.length) {
      const values = columns.map((column) => normalizeInputValue(column, payload[column]));
      values.push(idPropuesta);
      const assignments = columns.map((column, index) => `${column} = ${jsonColumns.has(column) ? `$${index + 1}::jsonb` : `$${index + 1}`}`);
      await client.query(
        `
          UPDATE propuestas_db
          SET ${assignments.join(", ")}, updated_at = NOW()
          WHERE id_propuesta = $${values.length}
        `,
        values,
      );
    }
    if (Array.isArray(payload.lineas)) await replaceLineas(client, idPropuesta, payload.lineas);
    if (Array.isArray(payload.cobros)) await replaceCobros(client, idPropuesta, payload.cobros);
    await client.query("COMMIT");
    return getPropuestaById(idPropuesta);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deletePropuesta(idPropuesta) {
  const pool = getPgPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM cobros_propuestas_db WHERE id_propuesta = $1", [idPropuesta]);
    await client.query("DELETE FROM lineas_propuestas_db WHERE id_propuesta = $1", [idPropuesta]);
    const { rows } = await client.query("DELETE FROM propuestas_db WHERE id_propuesta = $1 RETURNING *", [idPropuesta]);
    await client.query("COMMIT");
    return rows[0] ? normalizePropuesta(rows[0]) : null;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
