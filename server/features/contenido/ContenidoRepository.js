import { getPgPool } from "../../database/pgClient.js";

function getYearFromDate(value) {
  if (!value) return "";
  const text = String(value).trim();
  const parts = text.split(/[/-]/).map((part) => part.trim());
  const yearPart = parts.length >= 3 ? parts[2] : "";
  if (!yearPart) return "";
  return yearPart.length === 2 ? `20${yearPart}` : yearPart;
}

function normalizeHojaProd(row) {
  const estadoMaterial = String(row.estado_material_contenido || row.estado_contenido || "");
  const fechaPublicacion = row.fecha_publicacion || "";
  const paginaMatch = String(row.especificaciones_contenido ?? "").match(/p[áa]gina\s*([0-9]+)/i);

  return {
    id_contenido: row.id_contenido,
    agente: row.nombre_completo_agente || row.id_agente || "",
    cliente: row.nombre_empresa || row.id_cuenta || "",
    contrato: row.id_contrato || "",
    factura: row.factura || "",
    tipo: row.servicio_nombre || row.servicio || row.tipo || "",
    contenido: row.especificaciones_contenido || row.contenido_especifico_id || row.nombre_publicacion || "",
    estado: estadoMaterial.toLowerCase().includes("publicado") || estadoMaterial.toLowerCase().includes("ya en revista")
      ? "Publicado"
      : "Pendiente de publicar",
    pagina: paginaMatch?.[1] || "",
    caducidad: row.deadline_contenido || row.deadline_publicacion || "",
    fecha_publicacion: fechaPublicacion,
    ano_publicacion: getYearFromDate(fechaPublicacion),
  };
}

function normalizeContenido(row) {
  return {
    id_contenido: row.id_contenido,
    id_publicacion: row.id_publicacion ?? "",
    id_cuenta: row.id_cuenta ?? "",
    nombre_cuenta: row.nombre_empresa ?? "",
    id_agente: row.id_agente ?? "",
    contenido: row.especificaciones_contenido ?? "",
    estado: row.estado_contenido ?? "",
    deadline_contenido: row.deadline_contenido ?? "",
    medio: row.medio ?? "",
    servicio: row.servicio ?? "",
    nombre_servicio: row.nombre_servicio_es ?? "",
    contenido_especifico_id: row.contenido_especifico_id ?? "",
    url_contenido: row.url_contenido ?? "",
    precio_producto: row.precio_producto === null || row.precio_producto === undefined ? null : Number(row.precio_producto),
    deadline_publicacion: row.deadline_publicacion ?? "",
    estado_material_contenido: row.estado_material_contenido ?? "",
    destino_revista: Boolean(row.destino_revista),
    destino_vidrioperfil: Boolean(row.destino_vidrioperfil),
    fecha_maxima_publicacion_vidrioperfil: row.fecha_maxima_publicacion_vidrioperfil ?? "",
    tipo_articulo: row.tipo_articulo ?? "",
    id_gestion_prod: row.id_gestion_prod ?? "",
    destinos_publicacion: Array.isArray(row.destinos_publicacion) ? row.destinos_publicacion : [],
    revistas: row.revistas ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

let contenidosColumnCache = null;
let hasContenidosRevistasCache = null;

async function getContenidosColumns(pool) {
  if (contenidosColumnCache) return contenidosColumnCache;
  const { rows } = await pool.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'contenidos_db'
        AND column_name IN ('contenido_especifico_id', 'servicio', 'producto', 'publicacion', 'fecha_publicacion_publicacion')
    `,
  );
  contenidosColumnCache = new Set(rows.map((row) => row.column_name));
  return contenidosColumnCache;
}

async function hasContenidosRevistasTable(pool) {
  if (hasContenidosRevistasCache !== null) return hasContenidosRevistasCache;
  const { rows } = await pool.query(`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'contenidos_revistas_db'
    LIMIT 1
  `);
  hasContenidosRevistasCache = rows.length > 0;
  return hasContenidosRevistasCache;
}

export async function getHojaProduccionContenidos(filters = {}) {
  const pool = getPgPool();
  const columns = await getContenidosColumns(pool);
  const contenidoEspecificoExpr = columns.has("contenido_especifico_id") ? "c.contenido_especifico_id" : columns.has("publicacion") ? "c.publicacion" : "c.id_publicacion";
  const servicioExpr = columns.has("servicio") ? "c.servicio" : columns.has("producto") ? "c.producto" : "''";
  const fechaContenidoExpr = columns.has("fecha_publicacion_publicacion") ? "c.fecha_publicacion_publicacion" : "''";
  const values = [];
  const where = ["c.hoja_prod = true"];

  if (filters.year) {
    values.push(String(filters.year));
    where.push(`
      COALESCE(
        NULLIF(
          CASE
            WHEN split_part(COALESCE(p.fecha_publicacion, ${fechaContenidoExpr}, ''), '/', 3) <> ''
              THEN CASE
                WHEN length(split_part(COALESCE(p.fecha_publicacion, ${fechaContenidoExpr}, ''), '/', 3)) = 2
                  THEN '20' || split_part(COALESCE(p.fecha_publicacion, ${fechaContenidoExpr}, ''), '/', 3)
                ELSE split_part(COALESCE(p.fecha_publicacion, ${fechaContenidoExpr}, ''), '/', 3)
              END
            ELSE ''
          END,
          ''
        ),
        ''
      ) = $${values.length}
    `);
  }

  const { rows } = await pool.query(
    `
      WITH contratos_contenido AS (
        SELECT
          con.id_contrato,
          contenido_item->>'id_contenido' AS id_contenido
        FROM contratos_db con
        CROSS JOIN LATERAL jsonb_array_elements(con.array_contenidos) AS contenido_item
      ),
      facturas_contrato AS (
        SELECT
          id_contrato,
          string_agg(id_factura, ', ' ORDER BY id_factura) AS factura
        FROM ordenes_db
        GROUP BY id_contrato
      )
      SELECT
        c.*,
        ${contenidoEspecificoExpr} AS contenido_especifico_id,
        ${servicioExpr} AS servicio,
        p.nombre_publicacion,
        COALESCE(p.fecha_publicacion, ${fechaContenidoExpr}, '') AS fecha_publicacion,
        s.nombre_servicio_es AS servicio_nombre,
        a.nombre_completo_agente,
        cu.nombre_empresa,
        cc.id_contrato,
        fc.factura
      FROM contenidos_db c
      LEFT JOIN publicaciones_db p ON p.id_publicacion = ${contenidoEspecificoExpr}
      LEFT JOIN servicios_db s ON s.id_servicio = ${servicioExpr}
      LEFT JOIN agentes_db a ON a.id_agente = c.id_agente
      LEFT JOIN cuentas_db cu ON cu.id_cuenta = c.id_cuenta
      LEFT JOIN contratos_contenido cc ON cc.id_contenido = c.id_contenido
      LEFT JOIN facturas_contrato fc ON fc.id_contrato = cc.id_contrato
      WHERE ${where.join(" AND ")}
      ORDER BY
        to_date(COALESCE(p.fecha_publicacion, ${fechaContenidoExpr}, ''), 'DD/MM/YYYY') DESC NULLS LAST,
        c.id_contenido ASC
    `,
    values,
  );

  return rows.map(normalizeHojaProd);
}

export async function createHojaProduccionContenido(data = {}) {
  const pool = getPgPool();
  const idContenido = data.id_contenido?.trim() || `CONT-${Date.now()}`;
  const idGestion = data.id_gestion_prod || `gestion_${Date.now()}`;
  const destinos = Array.isArray(data.destinos_publicacion) ? data.destinos_publicacion : [];
  const materiales = Array.isArray(data.materiales_array) ? data.materiales_array : [];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      ALTER TABLE contenidos_db
        ADD COLUMN IF NOT EXISTS id_gestion_prod TEXT,
        ADD COLUMN IF NOT EXISTS destinos_publicacion JSONB NOT NULL DEFAULT '[]'::jsonb
    `);
    const { rows } = await client.query(
      `
      INSERT INTO contenidos_db (
        id_contenido,
        id_publicacion,
        id_cuenta,
        especificaciones_contenido,
        id_agente,
        estado_contenido,
        deadline_contenido,
        servicio,
        estado_material_contenido,
        hoja_prod,
        id_gestion_prod,
        destinos_publicacion,
        destino_revista,
        destino_vidrioperfil
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $11::jsonb, $12, $13)
      RETURNING *
    `,
      [
        idContenido,
        data.id_publicacion || null,
        data.id_cuenta || null,
        data.especificaciones_contenido || "",
        data.id_agente || null,
        data.estado_contenido || "Pendiente de publicar",
        data.deadline_contenido || "",
        data.tipo || "",
        data.estado_contenido || "",
        idGestion,
        JSON.stringify(destinos),
        destinos.some((item) => item.startsWith("revista_")),
        destinos.includes("vidrioperfil"),
      ],
    );
    await client.query(
      `INSERT INTO gestiones_produccion_db
        (id_gestion_prod,nombre_gestion,publicaciones_array,articulos_array,materiales_array)
       VALUES ($1,$2,$3::jsonb,'[]'::jsonb,$4::jsonb)`,
      [idGestion, data.nombre_gestion || data.especificaciones_contenido || idContenido, JSON.stringify(data.id_publicacion ? [data.id_publicacion] : []), JSON.stringify(materiales)],
    );
    const { rows: listRows } = await client.query("SELECT * FROM gestiones_prod_listas ORDER BY posicion_lista LIMIT 1");
    if (listRows[0]) {
      const existing = Array.isArray(listRows[0].array_objetos_gestiones) ? listRows[0].array_objetos_gestiones : [];
      existing.push([existing.length, idGestion]);
      await client.query("UPDATE gestiones_prod_listas SET array_objetos_gestiones=$1::jsonb,updated_at=NOW() WHERE id_lista_gestiones_prod=$2", [JSON.stringify(existing), listRows[0].id_lista_gestiones_prod]);
    }
    await client.query("COMMIT");
    return normalizeHojaProd(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getContenidosProduccion(filters = {}) {
  const pool = getPgPool();
  const columns = await getContenidosColumns(pool);
  const contenidoEspecificoExpr = columns.has("contenido_especifico_id") ? "c.contenido_especifico_id" : columns.has("publicacion") ? "c.publicacion" : "c.id_publicacion";
  const servicioExpr = columns.has("servicio") ? "c.servicio" : columns.has("producto") ? "c.producto" : "''";
  const values = [];
  const where = [];

  if (filters.estado) {
    if (filters.estado.toLowerCase().startsWith("pendiente")) {
      where.push(`LOWER(COALESCE(c.estado_contenido, '')) NOT LIKE '%publicado%'`);
    } else {
      values.push(filters.estado);
      where.push(`LOWER(c.estado_contenido) = LOWER($${values.length})`);
    }
  }

  if (filters.destino) {
    if (filters.destino === "revista") where.push("c.destino_revista = true");
    if (filters.destino === "vidrioperfil") where.push("c.destino_vidrioperfil = true");
  }

  if (filters.medio) {
    values.push(filters.medio);
    where.push(`lower(c.medio) = lower($${values.length})`);
  }

  if (filters.id_cuenta) {
    values.push(filters.id_cuenta);
    where.push(`c.id_cuenta = $${values.length}`);
  }

  if (filters.tipo_valor === "de_pago") {
    where.push(`coalesce(c.precio_producto, 0) > 0`);
  }

  if (filters.tipo_valor === "gratuito") {
    where.push(`coalesce(c.precio_producto, 0) = 0`);
  }

  const { rows } = await pool.query(
    `
      SELECT
        c.*,
        ${contenidoEspecificoExpr} AS contenido_especifico_id,
        ${servicioExpr} AS servicio,
        cu.nombre_empresa,
        s.nombre_servicio_es
      FROM contenidos_db c
      LEFT JOIN cuentas_db cu ON cu.id_cuenta = c.id_cuenta
      LEFT JOIN servicios_db s ON s.id_servicio = ${servicioExpr}
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY
        c.created_at DESC,
        c.id_contenido ASC
    `,
    values,
  );

  return rows.map(normalizeContenido);
}

export async function getContenidoProduccionById(idContenido) {
  const pool = getPgPool();
  const columns = await getContenidosColumns(pool);
  const hasRevistasTable = await hasContenidosRevistasTable(pool);
  const contenidoEspecificoExpr = columns.has("contenido_especifico_id") ? "c.contenido_especifico_id" : columns.has("publicacion") ? "c.publicacion" : "c.id_publicacion";
  const servicioExpr = columns.has("servicio") ? "c.servicio" : columns.has("producto") ? "c.producto" : "''";
  const { rows } = await pool.query(
    `
      SELECT
        c.*,
        ${contenidoEspecificoExpr} AS contenido_especifico_id,
        ${servicioExpr} AS servicio,
        cu.nombre_empresa,
        s.nombre_servicio_es,
        ${hasRevistasTable ? `
          coalesce(
            jsonb_agg(
              jsonb_build_object(
                'revista_id', r.id_revista,
                'revista', r.revista,
                'edicion', r.edicion,
                'publicacion', r.publicacion,
                'numero_pagina', cr.numero_pagina,
                'tipo_pagina', cr.tipo_pagina,
                'pagina_del_contenido', cr.pagina_del_contenido
              )
              ORDER BY r.revista, r.edicion, cr.numero_pagina
            ) FILTER (WHERE cr.contenido_revista_id IS NOT NULL),
            '[]'::jsonb
          )
        ` : "'[]'::jsonb"} AS revistas
      FROM contenidos_db c
      LEFT JOIN cuentas_db cu ON cu.id_cuenta = c.id_cuenta
      LEFT JOIN servicios_db s ON s.id_servicio = ${servicioExpr}
      ${hasRevistasTable ? "LEFT JOIN contenidos_revistas_db cr ON cr.contenido_id = c.id_contenido LEFT JOIN revistas_db r ON r.id_revista = cr.revista_id" : ""}
      WHERE c.id_contenido = $1
      GROUP BY c.id_contenido, cu.nombre_empresa, s.nombre_servicio_es
      LIMIT 1
    `,
    [idContenido],
  );

  return rows[0] ? normalizeContenido(rows[0]) : null;
}

export async function deleteContenidoProduccion(idContenido) {
  const pool = getPgPool();
  const { rowCount } = await pool.query(
    `DELETE FROM contenidos_db WHERE id_contenido = $1`,
    [idContenido],
  );

  return rowCount > 0;
}

export async function updateContenidoProduccion(idContenido, data = {}) {
  const pool = getPgPool();
  const values = [];
  const sets = [];

  if (Object.prototype.hasOwnProperty.call(data, "estado")) {
    values.push(data.estado || "");
    sets.push(`estado_contenido = $${values.length}`);
  }

  if (Object.prototype.hasOwnProperty.call(data, "estado_material_contenido")) {
    values.push(data.estado_material_contenido || "");
    sets.push(`estado_material_contenido = $${values.length}`);
  }

  if (!sets.length) return getContenidoProduccionById(idContenido);

  values.push(idContenido);
  const { rows } = await pool.query(
    `
      UPDATE contenidos_db
      SET ${sets.join(", ")}, updated_at = now()
      WHERE id_contenido = $${values.length}
      RETURNING id_contenido
    `,
    values,
  );

  return rows[0] ? getContenidoProduccionById(rows[0].id_contenido) : null;
}

export async function createContenidoProduccion(data = {}) {
  const pool = getPgPool();
  const idContenido = data.id_contenido?.trim() || `cont_${Date.now()}`;
  const destinoRevista = Boolean(data.destino_revista);
  const destinoVidrioperfil = Boolean(data.destino_vidrioperfil);

  const { rows } = await pool.query(
    `
      INSERT INTO contenidos_db (
        id_contenido,
        contenido_especifico_id,
        id_cuenta,
        especificaciones_contenido,
        id_agente,
        estado_contenido,
        deadline_contenido,
        servicio,
        destino_revista,
        destino_vidrioperfil,
        fecha_maxima_publicacion_vidrioperfil,
        tipo_articulo,
        estado_material_contenido,
        hoja_prod
      )
      VALUES ($1, $2, $3, $4, $5, 'Pendiente', $6, $7, $8, $9, $10, $11, 'Pendiente', true)
      RETURNING *
    `,
    [
      idContenido,
      data.contenido_especifico_id || data.id_publicacion || null,
      data.id_cuenta || null,
      data.especificaciones_contenido || "",
      data.id_agente || null,
      destinoVidrioperfil ? data.fecha_maxima_publicacion_vidrioperfil || "" : data.deadline_contenido || "",
      data.servicio || "",
      destinoRevista,
      destinoVidrioperfil,
      data.fecha_maxima_publicacion_vidrioperfil || "",
      data.tipo_articulo || "articulo",
    ],
  );

  return normalizeContenido(rows[0]);
}
