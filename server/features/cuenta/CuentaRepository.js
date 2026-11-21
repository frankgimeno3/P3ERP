import {testMode,testIdentifier} from '../identifiers/TestMode.js';
import {resolveIdentifier} from '../identifiers/IdentifierAliases.js';
import { assertCommercialAgent } from "../agente/CommercialAgent.js";
import { cuentaOrderBy } from './CuentaSorting.js';
import { syncRenewalAssignee } from './AccountTaskRepository.js';
import {allocateAccountIdentifier} from '../identifiers/BusinessIdentifiers.js';
import { getPgPool } from "../../database/pgClient.js";
import { addCuentaEvento, formatChangeDetail } from "../registroEventos/RegistroEventosRepository.js";
import { applySocialProfileChange, normalizeSocialProfiles } from "../../../app/lib/accountSocialProfiles.js";

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
  "campanas",
  "stands_ferias",
  "stands_ferias_ediciones",
  "tipo_cuenta",
  "descripcion_cuenta",
  "actividades_cuenta",
  "descripcion_actividad",
  "correo_principal",
  "ferias",
  "red_social_prioritaria",
  "seguimiento_qq",
  "canal_youtube",
  "catalogos",
  "catalogos_enlaces",
  "array_cuentas_distribuidoras",
  "array_cuentas_distribuidas",
  "cuenta_agencia",
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
  "catalogos_enlaces",
  "stands_ferias_ediciones",
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
    es_prueba:Boolean(row.es_prueba),
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
    campanas: row.campanas ?? "",
    stands_ferias: row.stands_ferias ?? "",
    stands_ferias_ediciones: Array.isArray(row.stands_ferias_ediciones) ? row.stands_ferias_ediciones : [],
    tipo_cuenta: row.tipo_cuenta ?? "",
    descripcion_cuenta: row.descripcion_cuenta ?? "",
    actividades_cuenta: row.actividades_normalizadas ?? row.actividades_cuenta ?? "",
    descripcion_actividad: row.descripcion_actividad ?? "",
    correo_principal: row.correo_principal ?? "",
    qq: /^OK/.test(row.seguimiento_qq ?? ""),
    presente_en_qq: /^OK/.test(row.seguimiento_qq ?? ""),
    ferias: Array.isArray(row.ferias) ? row.ferias : [],
    red_social_prioritaria: row.red_social_prioritaria ?? "",
    seguimiento_qq: row.seguimiento_qq ?? "",
    canal_youtube: row.canal_youtube ?? "",
    catalogos: row.catalogos ?? "",
    catalogos_enlaces: row.catalogos_enlaces ?? [],
    array_cuentas_distribuidoras: row.array_cuentas_distribuidoras ?? [],
    array_cuentas_distribuidas: row.array_cuentas_distribuidas ?? [],
    cuenta_agencia: row.cuenta_agencia ?? "",
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
  if (column === "seguimiento_qq" && !["","OKQQ","OKQQ LATAM","OK QQ ESPAÑA Y LATAM","AÑADIRQQ","CAMBIARQQ","QUITARQQ"].includes(value)) {
    throw Object.assign(new Error("Selecciona un seguimiento QQ válido."), { status: 400 });
  }
  if (column === "canal_youtube" && value) {
    try {
      const url = new URL(value);
      if (!["http:", "https:"].includes(url.protocol) || !["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname)) throw new Error();
      return url.href;
    } catch {
      throw Object.assign(new Error("Introduce una URL de YouTube válida."), { status: 400 });
    }
  }

  if (column === "stands_ferias_ediciones") {
    const seen = new Set();
    if (!Array.isArray(value) || value.some(row => {
      if (!row || typeof row.id_feria !== "string" || !row.id_feria.trim() || seen.has(row.id_feria) ||
        [row.hall, row.stand, row.fecha].some(part => typeof part !== "string" || part.length > 120)) return true;
      seen.add(row.id_feria);
      return false;
    })) throw Object.assign(new Error("Revisa las ediciones y los datos de los stands."), { status: 400 });
  }
  if (jsonColumns.has(column)) {
    if (column === "catalogos_enlaces" && Array.isArray(value)) {
      return JSON.stringify(value.map(item => {
        const nombre = typeof item?.nombre === "string" ? item.nombre.trim() : "";
        const fecha = typeof item?.fecha === "string" ? item.fecha : "";
        try {
          const url = new URL(item.url);
          const date = new Date(fecha);
          if (!nombre || nombre.length > 250 || url.href.length > 2048 || !["https:", "http:"].includes(url.protocol)
            || !/^\d{4}-\d{2}-\d{2}$/.test(fecha) || date.toISOString().slice(0, 10) !== fecha) throw new Error();
          return { nombre, url: url.href, fecha };
        } catch {
          throw Object.assign(new Error("Revisa los nombres, fechas y enlaces de los catálogos."), { status: 400 });
        }
      }));
    }
    if (value === undefined || value === null) return JSON.stringify(column === "datos_comerciales" ? {} : []);
    if (column === "datos_comerciales") return JSON.stringify(value && typeof value === "object" ? value : {});
    return JSON.stringify(Array.isArray(value) ? value : []);
  }

  if (["receptor_revista", "suscriptor_revista"].includes(column)) {
    return Boolean(value);
  }

  return value;
}

const activityNames = `COALESCE((SELECT string_agg(c.nombre,' |##| ' ORDER BY c.nombre)
  FROM comercial_cuenta_actividades r JOIN operaciones_clasificaciones c ON c.id=r.id_clasificacion
  WHERE r.id_cuenta=comercial_cuentas.id_cuenta),'') AS actividades_normalizadas`;

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

  if (filters.codigoEdisoftFiltro) {
    values.push(`%${filters.codigoEdisoftFiltro}%`);
    where.push(`id_edisoft::text ILIKE $${values.length}`);
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
    values.push(filters.paisExacto ? filters.paisFiltro : `%${filters.paisFiltro}%`);
    where.push(`pais_cuenta ${filters.paisExacto ? '=' : 'ILIKE'} $${values.length}`);
  }
  if(filters.correoFiltro){values.push(`%${filters.correoFiltro}%`);where.push(`correo_principal ILIKE $${values.length}`);}

  const paged = Number.isInteger(filters.limit) && filters.limit > 0;
  const condition = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const count = paged ? Number((await pool.query(`SELECT count(*) total FROM ${tableName} ${condition}`, values)).rows[0].total) : null;
  let pagination = '';
  if (paged) { values.push(filters.limit, ((filters.page || 1) - 1) * filters.limit); pagination = `LIMIT $${values.length - 1} OFFSET $${values.length}`; }
  const query = `
    SELECT *, ${activityNames}
    FROM ${tableName}
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY ${cuentaOrderBy(filters.sortBy, filters.sortDirection)}
    ${pagination}
  `;

  const { rows } = await pool.query(query, values);
  return paged ? { rows: rows.map(normalizeCuenta), total: count, page: filters.page || 1, limit: filters.limit } : rows.map(normalizeCuenta);
}

export async function getCuentaCountries() {
  const { rows } = await getPgPool().query(`SELECT DISTINCT pais_cuenta FROM ${tableName} WHERE pais_cuenta IS NOT NULL AND btrim(pais_cuenta) <> '' ORDER BY pais_cuenta ASC`);
  return rows.map(row => row.pais_cuenta);
}

export async function getCuentaTypes() {
  const { rows } = await getPgPool().query(
    `SELECT DISTINCT btrim(tipo_cuenta) AS tipo FROM ${tableName}
     WHERE btrim(tipo_cuenta) <> '' ORDER BY tipo`,
  );
  return rows.map(row => row.tipo);
}

export async function getCuentaCategories() {
  const { rows } = await getPgPool().query(`
    SELECT btrim(datos_comerciales->>'categoria_principal_cuenta') AS categoria
    FROM comercial_cuentas
    WHERE btrim(datos_comerciales->>'categoria_principal_cuenta') <> ''
    GROUP BY 1 ORDER BY count(*) DESC, categoria
  `);
  return rows.map(row => row.categoria);
}

export async function getCuentaById(idCuenta) {
  idCuenta=await resolveIdentifier('cuenta',idCuenta);
  const pool = getPgPool();
  const { rows } = await pool.query(
    `SELECT *, ${activityNames} FROM ${tableName} WHERE id_cuenta = $1 LIMIT 1`,
    [idCuenta],
  );

  const row = rows[0];
  return row ? {
    ...normalizeCuenta(row),
    redes_sociales: normalizeSocialProfiles(row.redes_sociales, row.red_social_prioritaria),
  } : null;
}

export async function changeAccountSocialProfile(idCuenta, change, pool = getPgPool()) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: [account] } = await client.query(
      "SELECT redes_sociales, red_social_prioritaria FROM comercial_cuentas WHERE id_cuenta = $1 FOR UPDATE",
      [idCuenta],
    );
    if (!account) throw Object.assign(new Error("Cuenta no encontrada."), { status: 404 });
    const perfiles = applySocialProfileChange(account.redes_sociales, account.red_social_prioritaria, change);
    if (!perfiles) throw Object.assign(new Error("Selecciona una red y una URL de perfil válidas."), { status: 400 });
    await client.query(
      "UPDATE comercial_cuentas SET redes_sociales = $2::jsonb, updated_at = NOW() WHERE id_cuenta = $1 AND redes_sociales IS DISTINCT FROM $2::jsonb",
      [idCuenta, JSON.stringify(perfiles)],
    );
    await client.query("COMMIT");
    return perfiles;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createCuenta(cuentaData) {
  const requestedId = String(cuentaData.id_cuenta || '').trim();
  if(requestedId && !/^(?:PRUEBA-)?ACC[0-9]+$/.test(requestedId))throw Object.assign(new Error('El ID de cuenta debe seguir la serie ACC.'),{status:400});
  const pool = getPgPool();
  await assertCommercialAgent(pool, cuentaData.id_agente);
  const columns = writableColumns.filter((column) => column === "id_cuenta" || cuentaData[column] !== undefined);
  const values = columns.map((column) => normalizeValue(column, cuentaData[column]));
  const placeholders = columns.map((column, index) => {
    const placeholder = `$${index + 1}`;
    return jsonColumns.has(column) ? `${placeholder}::jsonb` : placeholder;
  });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const generated = await allocateAccountIdentifier(client);
    values[columns.indexOf("id_cuenta")] = testIdentifier(requestedId || generated,await testMode(client,{requested:cuentaData.es_prueba??false}));
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
  for (const field of ["array_cuentas_distribuidoras", "array_cuentas_distribuidas"]) {
    if (Array.isArray(cuentaData[field]) && cuentaData[field].some(row => row?.id_cuenta === idCuenta)) {
      throw Object.assign(new Error("Una cuenta no puede vincularse consigo misma como distribuidora."), { status: 400 });
    }
  }
  const pool = getPgPool();
  const before = await getCuentaById(idCuenta);
  idCuenta = before?.id_cuenta || idCuenta;
  if (cuentaData.id_agente !== undefined) await assertCommercialAgent(pool, cuentaData.id_agente, before?.id_agente);
  const columns = writableColumns.filter((column) => column !== "id_cuenta" && cuentaData[column] !== undefined);
  const values = columns.map((column) => normalizeValue(column, cuentaData[column]));

  if (!columns.length) {
    return getCuentaById(idCuenta);
  }

  values.push(idCuenta);
  const assignments = columns.map((column, index) => {
    const placeholder = `$${index + 1}`;
    if (column === "datos_comerciales" && cuentaData.preservar_contacto_principal === true) {
      return `datos_comerciales = CASE
        WHEN datos_comerciales ? 'contacto_principal'
          THEN jsonb_set(${placeholder}::jsonb, '{contacto_principal}', datos_comerciales->'contacto_principal')
        ELSE ${placeholder}::jsonb - 'contacto_principal'
      END`;
    }
    return jsonColumns.has(column) ? `${column} = ${placeholder}::jsonb` : `${column} = ${placeholder}`;
  });

  const client = await pool.connect();
  let rows;
  try {
    await client.query('BEGIN');
    const locked = (await client.query(
      'SELECT id_agente,asignado_a FROM comercial_cuentas WHERE id_cuenta=$1 FOR UPDATE', [idCuenta],
    )).rows[0];
    ({ rows } = await client.query(
    `
      UPDATE ${tableName}
      SET ${assignments.join(", ")}, updated_at = NOW()
      WHERE id_cuenta = $${values.length}
      RETURNING *
    `,
    values,
    ));
    if (locked && rows[0]) {
      const changedField = (locked.asignado_a ?? '') !== (rows[0].asignado_a ?? '') ? 'asignado_a'
        : (locked.id_agente ?? '') !== (rows[0].id_agente ?? '') ? 'id_agente' : null;
      if (changedField) await syncRenewalAssignee(client, rows[0], changedField);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

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

export async function getCuentasTotal() {
  const { rows } = await getPgPool().query("SELECT count(*)::int AS total FROM comercial_cuentas");
  return rows[0].total;
}
