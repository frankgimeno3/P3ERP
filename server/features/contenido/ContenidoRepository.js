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
  const datos = row.datos_en_propuesta ?? {};
  const estadoMaterial = String(datos.estado_material_contenido ?? row.estado_contenido ?? "");
  const fechaPublicacion = datos.fecha_publicacion_publicacion || row.fecha_publicacion || "";
  const paginaMatch = String(row.especificaciones_contenido ?? "").match(/p[áa]gina\s*([0-9]+)/i);

  return {
    id_contenido: row.id_contenido,
    agente: row.nombre_completo_agente || row.id_agente || "",
    cliente: row.nombre_empresa || row.id_cuenta || "",
    contrato: row.id_contrato || "",
    factura: row.factura || "",
    tipo: datos.producto || row.tipo || "",
    contenido: row.especificaciones_contenido || datos.publicacion || row.nombre_publicacion || "",
    estado: estadoMaterial.toLowerCase().includes("publicado") || estadoMaterial.toLowerCase().includes("ya en revista")
      ? "Publicado"
      : "Pendiente de publicar",
    pagina: paginaMatch?.[1] || datos.pagina || "",
    caducidad: row.deadline_contenido || datos.deadline_publicacion || "",
    fecha_publicacion: fechaPublicacion,
    ano_publicacion: getYearFromDate(fechaPublicacion),
  };
}

export async function getHojaProduccionContenidos(filters = {}) {
  const pool = getPgPool();
  const values = [];
  const where = ["c.hoja_prod = true"];

  if (filters.year) {
    values.push(String(filters.year));
    where.push(`
      COALESCE(
        NULLIF(
          CASE
            WHEN split_part(COALESCE(c.datos_en_propuesta->>'fecha_publicacion_publicacion', p.fecha_publicacion, ''), '/', 3) <> ''
              THEN CASE
                WHEN length(split_part(COALESCE(c.datos_en_propuesta->>'fecha_publicacion_publicacion', p.fecha_publicacion, ''), '/', 3)) = 2
                  THEN '20' || split_part(COALESCE(c.datos_en_propuesta->>'fecha_publicacion_publicacion', p.fecha_publicacion, ''), '/', 3)
                ELSE split_part(COALESCE(c.datos_en_propuesta->>'fecha_publicacion_publicacion', p.fecha_publicacion, ''), '/', 3)
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
        p.nombre_publicacion,
        p.fecha_publicacion,
        a.nombre_completo_agente,
        cu.nombre_empresa,
        cc.id_contrato,
        fc.factura
      FROM contenidos_db c
      LEFT JOIN publicaciones_db p ON p.id_publicacion = c.id_publicacion
      LEFT JOIN agentes_db a ON a.id_agente = c.id_agente
      LEFT JOIN cuentas_db cu ON cu.id_cuenta = c.id_cuenta
      LEFT JOIN contratos_contenido cc ON cc.id_contenido = c.id_contenido
      LEFT JOIN facturas_contrato fc ON fc.id_contrato = cc.id_contrato
      WHERE ${where.join(" AND ")}
      ORDER BY
        to_date(COALESCE(c.datos_en_propuesta->>'fecha_publicacion_publicacion', p.fecha_publicacion, ''), 'DD/MM/YYYY') DESC NULLS LAST,
        c.id_contenido ASC
    `,
    values,
  );

  return rows.map(normalizeHojaProd);
}
