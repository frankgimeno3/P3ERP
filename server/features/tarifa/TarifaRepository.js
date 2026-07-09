import { getPgPool } from "../../database/pgClient.js";

function normalizeTarifa(row) {
  return {
    id_tarifa: row.id_tarifa,
    nombre_docu_tarifas: row.nombre_docu_tarifas ?? "",
    ano: row.ano ?? "",
    version: row.version ?? "",
    idioma: row.idioma ?? "",
    estado_tarifa: row.estado_tarifa ?? "vigente",
    paginas: row.paginas ?? [],
  };
}

let hasEstadoTarifa = null;

async function tarifasHasEstado(pool) {
  if (hasEstadoTarifa !== null) return hasEstadoTarifa;
  const { rows } = await pool.query(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tarifas_db'
      AND column_name = 'estado_tarifa'
    LIMIT 1
  `);
  hasEstadoTarifa = rows.length > 0;
  return hasEstadoTarifa;
}

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
  };
}

export async function getTarifas(filters = {}) {
  const pool = getPgPool();
  const hasEstado = await tarifasHasEstado(pool);
  const values = [];
  const where = [];

  if (filters.estado && hasEstado) {
    values.push(filters.estado);
    where.push(`t.estado_tarifa = $${values.length}`);
  }

  if (filters.estado === "deprecada" && !hasEstado) {
    return [];
  }

  const { rows } = await pool.query(`
    SELECT
      t.*,
      ${hasEstado ? "t.estado_tarifa" : "'vigente' AS estado_tarifa"},
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id_pagina_tarifa', p.id_pagina_tarifa,
            'id_tarifa', p.id_tarifa,
            'array_id_servicios', p.array_id_servicios
          )
          ORDER BY p.id_pagina_tarifa
        ) FILTER (WHERE p.id_pagina_tarifa IS NOT NULL),
        '[]'::jsonb
      ) AS paginas
    FROM tarifas_db t
    LEFT JOIN paginas_tarifas p ON p.id_tarifa = t.id_tarifa
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    GROUP BY t.id_tarifa
    ORDER BY t.ano DESC, t.idioma ASC, t.version DESC
  `, values);

  return rows.map(normalizeTarifa);
}

export async function getTarifaById(idTarifa) {
  const pool = getPgPool();
  const hasEstado = await tarifasHasEstado(pool);
  const { rows } = await pool.query(
    `
      SELECT
        t.*,
        ${hasEstado ? "t.estado_tarifa" : "'vigente' AS estado_tarifa"},
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'id_pagina_tarifa', p.id_pagina_tarifa,
              'id_tarifa', p.id_tarifa,
              'array_id_servicios', p.array_id_servicios,
              'servicios', COALESCE(ps.servicios, '[]'::jsonb)
            )
            ORDER BY p.id_pagina_tarifa
          ) FILTER (WHERE p.id_pagina_tarifa IS NOT NULL),
          '[]'::jsonb
        ) AS paginas
      FROM tarifas_db t
      LEFT JOIN paginas_tarifas p ON p.id_tarifa = t.id_tarifa
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(to_jsonb(sv) ORDER BY servicio_ord.ordinality) AS servicios
        FROM unnest(p.array_id_servicios) WITH ORDINALITY AS servicio_ord(id_servicio, ordinality)
        JOIN (
          SELECT s.*, g.nombre_medio
          FROM servicios_db s
          LEFT JOIN grupos_servicios g ON g.id_medio = s.id_medio
        ) sv ON sv.id_servicio = servicio_ord.id_servicio
      ) ps ON true
      WHERE t.id_tarifa = $1
      GROUP BY t.id_tarifa
      LIMIT 1
    `,
    [idTarifa],
  );

  if (!rows[0]) return null;
  return {
    ...normalizeTarifa(rows[0]),
    paginas: (rows[0].paginas || []).map((pagina) => ({
      ...pagina,
      servicios: (pagina.servicios || []).map(normalizeServicio),
    })),
  };
}
