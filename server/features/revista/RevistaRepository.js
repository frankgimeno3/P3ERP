import {magazineEvents,magazineDate} from '../../../app/config/magazineEvents.js';
import { getPgPool } from "../../database/pgClient.js";

let contenidosRevistasTableCache = null;

const basePagePreferences = [
  [-1, "portada"],
  [0, "interior_portada"],
  [1, "pag_pref_1"],
  [2, "pag_pref_2"],
  [3, "pag_pref_3"],
  [4, "sumario"],
  [5, "pag_pref_5"],
  [6, "indice"],
  [7, "pag_pref_5"],
];

function normalizePageCount(value) {
  const requested = Math.max(9, Number(value) || 9);
  return requested % 2 === 0 ? requested + 1 : requested;
}

function pagePreference(pageNumber) {
  return basePagePreferences.find(([number]) => number === pageNumber)?.[1] || `pag_pref_${pageNumber}`;
}

function preferredPageType(preference = "") {
  const value = String(preference || "").toLowerCase();
  if (value === "portada") return "Portada";
  if (value === "indice") return "Indice";
  if (value === "sumario") return "Sumario";
  if (value === "interior_portada") return "Interior portada";
  if (value.startsWith("pag_pref_")) return "Anuncio";
  return "";
}

function normalizeRevista(row) {
  const rawTitle = String(row.revista ?? row.detalle_publicacion ?? "").trim();
  const title = rawTitle === "Vidrio Plano" ? "Revista del Vidrio Plano"
    : rawTitle === "Ventanas, Puertas, Cerramientos y Protección Solar" ? "Revista Ventanas, Puertas, Cerramientos y Protección Solar"
      : rawTitle === "Hueco Arquitectura" ? "Revista Hueco Arquitectura"
        : rawTitle === "Quién es Quién" ? "Revista Quién es Quién"
          : rawTitle;
  const rawEdition = String(row.edicion ?? row.edicion_publicacion ?? "").trim().replace(/^Edición\s+/i, "");
  const edition = rawTitle === "Quién es Quién" ? `Edición ${rawEdition}` : rawEdition;
  const version = String(row.version_publicacion ?? row.impresa_o_digital ?? "").toLowerCase();
  const versionLabel = /impresa.*digital|digital.*impresa/.test(version) ? "versión digital e impresa" : version.includes("impresa") ? "versión impresa" : version.includes("digital") ? "versión digital" : "";
  const serial = String(row.numero_publicacion ?? row.publicacion ?? "").trim();
  const detail = [serial, ["Vidrio Plano", "Ventanas, Puertas, Cerramientos y Protección Solar"].includes(rawTitle) ? versionLabel : ""].filter(Boolean).join(" · ");
  return {
    id_publicacion: row.id_publicacion ?? "",
    id_revista: row.id_revista,
    medio_publicacion: title,
    edicion_publicacion: edition,
    detalle_publicacion: detail || row.detalle_publicacion || "",
    edicion: edition,
    revista: title,
    publicacion: detail || row.detalle_publicacion || "",
    numero: row.numero_publicacion ?? row.publicacion ?? "",
    numero_publicacion: row.numero_publicacion ?? row.publicacion ?? "",
    deadline_materiales: row.deadline_materiales ?? row.deadline_material ?? "",
    fecha_publicacion: row.fecha_publicacion ?? "",
    fecha_recordatorio: row.fecha_recordatorio ?? "",
    ...Object.fromEntries(magazineEvents.map(event=>[event.key,row[event.key]||''])),
    estado_publicacion: row.estado_publicacion ?? "",
    impresa_o_digital: row.impresa_o_digital ?? row.version_publicacion ?? "",
    version_publicacion: row.version_publicacion ?? row.impresa_o_digital ?? "",
    especial: row.especial ?? "",
    contenido_editorial: row.contenido_editorial ?? "",
    num_paginas: Number(row.num_paginas ?? 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
    contenidos: row.contenidos ?? [],
  };
}


async function hasContenidosRevistasTable(pool = getPgPool()) {
  if (contenidosRevistasTableCache !== null) return contenidosRevistasTableCache;
  const { rows } = await pool.query(`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'contenidos_revistas_db'
    LIMIT 1
  `);
  contenidosRevistasTableCache = rows.length > 0;
  return contenidosRevistasTableCache;
}

export async function getRevistas() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    SELECT
      r.*,
      p.id_publicacion,
      p.medio_publicacion,
      p.edicion_publicacion,
      p.detalle_publicacion,
      p.numero_publicacion,
      p.fecha_publicacion,
      p.estado_publicacion,
      p.deadline_materiales,
      p.fecha_recordatorio,
      p.fecha_pedir_materiales,p.deadline_real_materiales,p.fecha_envio_imprenta,p.fecha_estimada_impresion,p.fecha_envio_revistas,
      p.version_publicacion
    FROM servicios_publicaciones p
    LEFT JOIN servicios_revistas r ON r.id_revista = p.revista_id
    WHERE (p.tipo_publicacion = 'revista' OR p.medio_publicacion ILIKE '%revista%')
      AND r.id_revista IS NOT NULL
    ORDER BY
      p.medio_publicacion ASC,
      p.edicion_publicacion ASC,
      nullif(regexp_replace(p.numero_publicacion, '\\D', '', 'g'), '')::int ASC NULLS LAST,
      p.numero_publicacion ASC,
      p.id_publicacion ASC
  `);

  const publicationTime = (value) => {
    const text=String(value||'');
    const match=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const iso=match?`${match[3]}-${match[2].padStart(2,'0')}-${match[1].padStart(2,'0')}`:text;
    const time=Date.parse(iso);
    return Number.isNaN(time)?Number.MAX_SAFE_INTEGER:time;
  };
  return rows.map(normalizeRevista).sort((a,b)=>publicationTime(a.fecha_publicacion)-publicationTime(b.fecha_publicacion));
}

export async function getRevistaById(idRevista) {
  const pool = getPgPool();
  const hasPlanillo = await hasContenidosRevistasTable(pool);
  const { rows } = await pool.query(
    hasPlanillo ? `
      SELECT
        r.*,
        p.id_publicacion,
        p.numero_publicacion,
        p.fecha_publicacion,
        p.fecha_recordatorio,
      p.fecha_pedir_materiales,p.deadline_real_materiales,p.fecha_envio_imprenta,p.fecha_estimada_impresion,p.fecha_envio_revistas,
        p.estado_publicacion,
        p.version_publicacion,
        p.deadline_materiales,
        p.contenido_editorial,
        p.num_paginas,
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'contenido_revista_id', cr.contenido_revista_id,
              'contenido_id', c.id_contenido,
              'cuenta', coalesce(cu.nombre_empresa, c.id_cuenta, ''),
              'servicio', coalesce(s.nombre_servicio_es, c.servicio, ''),
              'contenido', coalesce(c.especificaciones_contenido, ''),
              'estado', coalesce(c.estado_contenido, ''),
              'deadline_contenido', coalesce(c.deadline_contenido, ''),
              'numero_pagina', cr.numero_pagina,
              'tipo_pagina', cr.tipo_pagina,
              'pagina_del_contenido', cr.pagina_del_contenido
            )
            ORDER BY cr.numero_pagina ASC, cr.pagina_del_contenido ASC
          ) FILTER (WHERE cr.contenido_revista_id IS NOT NULL),
          '[]'::jsonb
        ) AS contenidos
      FROM servicios_revistas r
      LEFT JOIN servicios_publicaciones p ON p.revista_id = r.id_revista AND (p.tipo_publicacion = 'revista' OR p.tipo_publicacion = '')
      LEFT JOIN contenidos_revistas_db cr ON cr.revista_id = r.id_revista
      LEFT JOIN produccion_contenidos c ON c.id_contenido = cr.contenido_id
      LEFT JOIN comercial_cuentas cu ON cu.id_cuenta = c.id_cuenta
      LEFT JOIN servicios_db s ON s.id_servicio = c.servicio
      WHERE r.id_revista = $1 OR p.id_publicacion = $1
      GROUP BY r.id_revista, p.id_publicacion, p.numero_publicacion, p.fecha_publicacion, p.fecha_recordatorio,
      p.fecha_pedir_materiales,p.deadline_real_materiales,p.fecha_envio_imprenta,p.fecha_estimada_impresion,p.fecha_envio_revistas, p.estado_publicacion, p.deadline_materiales
      LIMIT 1
    ` : `
      SELECT
        r.*,
        p.id_publicacion,
        p.numero_publicacion,
        p.fecha_publicacion,
        p.fecha_recordatorio,
      p.fecha_pedir_materiales,p.deadline_real_materiales,p.fecha_envio_imprenta,p.fecha_estimada_impresion,p.fecha_envio_revistas,
        p.estado_publicacion,
        p.version_publicacion,
        p.deadline_materiales,
        p.contenido_editorial,
        p.num_paginas,
        '[]'::jsonb AS contenidos
      FROM servicios_revistas r
      LEFT JOIN servicios_publicaciones p ON p.revista_id = r.id_revista AND (p.tipo_publicacion = 'revista' OR p.tipo_publicacion = '')
      WHERE r.id_revista = $1 OR p.id_publicacion = $1
      LIMIT 1
    `,
    [idRevista],
  );

  return rows[0] ? normalizeRevista(rows[0]) : null;
}

export async function updateRevista(idRevista, data = {}) {
  data=validatedMagazineDates(data);
  const pool = getPgPool();

  const revistaFields = ["especial", "edicion", "revista", "impresa_o_digital"];
  const revistaValues = [];
  const revistaSets = [];
  for (const field of revistaFields) {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      revistaValues.push(data[field] || "");
      revistaSets.push(`${field} = $${revistaValues.length}`);
    }
  }

  if (revistaSets.length) {
    revistaValues.push(idRevista);
    await pool.query(
      `UPDATE servicios_revistas SET ${revistaSets.join(", ")}, updated_at = NOW() WHERE id_revista = $${revistaValues.length}`,
      revistaValues,
    );
  }

  const publicacionValues = [];
  const publicacionSets = [];
  const publicacionFieldMap = {
    ...Object.fromEntries(magazineEvents.map(event=>[event.key,event.key])),
    publicacion: "numero_publicacion",
    numero_publicacion: "numero_publicacion",
    deadline_materiales: "deadline_materiales",
    fecha_publicacion: "fecha_publicacion",
    fecha_recordatorio: "fecha_recordatorio",
    estado_publicacion: "estado_publicacion",
    version_publicacion: "version_publicacion",
    impresa_o_digital: "version_publicacion",
    contenido_editorial: "contenido_editorial",
  };
  for (const [inputField, dbField] of Object.entries(publicacionFieldMap)) {
    if (Object.prototype.hasOwnProperty.call(data, inputField)) {
      if (inputField === "estado_publicacion" && !["publicada", "pendiente de publicar"].includes(data[inputField])) {
        throw new Error("Estado de revista no válido");
      }
      publicacionValues.push(data[inputField] || "");
      publicacionSets.push(`${dbField} = $${publicacionValues.length}`);
    }
  }

  if (publicacionSets.length) {
    publicacionValues.push(idRevista);
    await pool.query(
      `
        UPDATE servicios_publicaciones
        SET ${publicacionSets.join(", ")}, updated_at = NOW()
        WHERE revista_id = $${publicacionValues.length} OR id_publicacion = $${publicacionValues.length}
      `,
      publicacionValues,
    );
  }

  return getRevistaById(idRevista);
}

async function resolvePublicationId(idPublicacion, pool = getPgPool()) {
  const { rows } = await pool.query(
    `SELECT id_publicacion FROM servicios_publicaciones
     WHERE id_publicacion=$1 OR revista_id=$1
     ORDER BY CASE WHEN id_publicacion=$1 THEN 0 ELSE 1 END
     LIMIT 1`,
    [idPublicacion],
  );
  return rows[0]?.id_publicacion || "";
}

export async function getPaginasPublicacion(idPublicacion) {
  const pool = getPgPool();
  const resolvedId = await resolvePublicationId(idPublicacion, pool);
  if (!resolvedId) return null;
  const [publication, pages] = await Promise.all([
    pool.query("SELECT id_publicacion,num_paginas FROM servicios_publicaciones WHERE id_publicacion=$1", [resolvedId]),
    pool.query(`
      SELECT pp.*,c.especificaciones_contenido AS contenido,cu.nombre_empresa AS cuenta,
        EXISTS (
          SELECT 1 FROM comercial_propuestas_lineas lp
          JOIN comercial_propuestas_db pr ON pr.id_propuesta = lp.id_propuesta
          WHERE lp.id_pagina_publicacion = pp.id_pagina_publicacion
            AND LOWER(COALESCE(pr.estado_propuesta, '')) NOT IN ('rechazada', 'cancelada')
        ) AS ofrecida
      FROM servicios_paginas_revista pp
      LEFT JOIN produccion_contenidos c ON c.id_contenido=pp.id_contenido
      LEFT JOIN comercial_cuentas cu ON cu.id_cuenta=pp.id_cuenta
      WHERE pp.publication_id=$1
      ORDER BY pp.pagina_actual
    `, [resolvedId]),
  ]);
  return { id_publicacion: resolvedId, num_paginas: Number(publication.rows[0]?.num_paginas || 0), paginas: pages.rows };
}

export async function setNumeroPaginas(idPublicacion, requestedPages) {
  const pool = getPgPool();
  const resolvedId = await resolvePublicationId(idPublicacion, pool);
  if (!resolvedId) return null;
  const numPaginas = normalizePageCount(requestedPages);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE servicios_publicaciones SET num_paginas=$1,updated_at=NOW() WHERE id_publicacion=$2", [numPaginas, resolvedId]);
    for (let index = 0; index < numPaginas; index += 1) {
      const paginaActual = index - 1;
      await client.query(
        `INSERT INTO servicios_paginas_revista
          (id_pagina_publicacion,publication_id,pagina_actual,pagina_preferente,tipo)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (publication_id,pagina_actual) DO NOTHING`,
        [`pag_${resolvedId}_${paginaActual}`, resolvedId, paginaActual, pagePreference(paginaActual), preferredPageType(pagePreference(paginaActual))],
      );
    }
    await client.query("DELETE FROM servicios_paginas_revista WHERE publication_id=$1 AND pagina_actual >= $2", [resolvedId, numPaginas - 1]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return getPaginasPublicacion(resolvedId);
}

export async function updatePaginaPublicacion(idPublicacion, idPagina, data = {}) {
  const pool = getPgPool();
  const resolvedId = await resolvePublicationId(idPublicacion, pool);
  if (!resolvedId) return null;
  const currentResult = await pool.query(
    "SELECT * FROM servicios_paginas_revista WHERE id_pagina_publicacion=$1 AND publication_id=$2",
    [idPagina, resolvedId],
  );
  const current = currentResult.rows[0];
  if (!current) return null;
  const nextContentId = Object.prototype.hasOwnProperty.call(data, "id_contenido") ? data.id_contenido || null : current.id_contenido;
  let idCuenta = current.id_cuenta || null;
  if (nextContentId) {
    const contenido = await pool.query("SELECT id_cuenta FROM produccion_contenidos WHERE id_contenido=$1", [nextContentId]);
    idCuenta = contenido.rows[0]?.id_cuenta || null;
  } else {
    idCuenta = null;
  }
  const { rows } = await pool.query(
    `UPDATE servicios_paginas_revista
     SET has_content=$1,id_contenido=$2,id_cuenta=$3,updated_at=NOW()
        ,nombre_mostrado=$4,tipo=$5
     WHERE id_pagina_publicacion=$6 AND publication_id=$7
     RETURNING *`,
    [
      Object.prototype.hasOwnProperty.call(data, "has_content") ? Boolean(data.has_content) : Boolean(current.has_content),
      nextContentId,
      idCuenta,
      Object.prototype.hasOwnProperty.call(data, "nombre_mostrado") ? data.nombre_mostrado || "" : current.nombre_mostrado || "",
      Object.prototype.hasOwnProperty.call(data, "tipo") ? data.tipo || "" : current.tipo || "",
      idPagina,
      resolvedId,
    ],
  );
  return rows[0] || null;
}

function pageId(publicationId, pageNumber) {
  return `pag_${publicationId}_${pageNumber}_${Date.now().toString(36)}`;
}

export async function assignContentToPages(idPublicacion, data = {}) {
  const pool = getPgPool();
  const resolvedId = await resolvePublicationId(idPublicacion, pool);
  if (!resolvedId) return null;
  const selectedIds = [...new Set(Array.isArray(data.page_ids) ? data.page_ids : [])];
  if (!selectedIds.length || !data.id_contenido) throw new Error("Selecciona páginas y contenido.");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: allPages } = await client.query("SELECT * FROM servicios_paginas_revista WHERE publication_id=$1 ORDER BY pagina_actual FOR UPDATE", [resolvedId]);
    const selected = allPages.filter((page) => selectedIds.includes(page.id_pagina_publicacion));
    if (selected.length !== selectedIds.length) throw new Error("Alguna página seleccionada ya no existe.");
    const conflicts = selected.filter((page) => page.id_contenido && page.id_contenido !== data.id_contenido);
    if (conflicts.length && !["replace", "shift"].includes(data.conflict_action)) {
      const error = new Error("Las páginas seleccionadas ya contienen otro contenido.");
      error.code = "PAGE_CONTENT_CONFLICT";
      throw error;
    }

    const conflictContentIds = [...new Set(conflicts.map((page) => page.id_contenido).filter(Boolean))];
    const shiftedSourcePageIds = [];
    if (conflictContentIds.length && data.conflict_action === "shift") {
      for (const contentId of conflictContentIds) {
        const group = allPages.filter((page) => page.id_contenido === contentId).sort((a, b) => a.pagina_actual - b.pagina_actual);
        shiftedSourcePageIds.push(...group.map((page) => page.id_pagina_publicacion));
        const currentMaxResult = await client.query("SELECT COALESCE(MAX(pagina_actual),-2)::int AS value FROM servicios_paginas_revista WHERE publication_id=$1", [resolvedId]);
        let nextNumber = currentMaxResult.rows[0].value + 1;
        for (const oldPage of group) {
          await client.query(
            `INSERT INTO servicios_paginas_revista
              (id_pagina_publicacion,publication_id,pagina_actual,has_content,id_contenido,id_cuenta,nombre_mostrado,tipo,pagina_preferente,ordinal)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
            [pageId(resolvedId, nextNumber), resolvedId, nextNumber, oldPage.has_content, oldPage.id_contenido, oldPage.id_cuenta, oldPage.nombre_mostrado, preferredPageType(pagePreference(nextNumber)) || oldPage.tipo, pagePreference(nextNumber), oldPage.ordinal],
          );
          nextNumber += 1;
        }
      }
    }
    if (conflictContentIds.length) {
      if (data.conflict_action === "shift") {
        await client.query(
          `UPDATE servicios_paginas_revista SET has_content=FALSE,id_contenido=NULL,id_cuenta=NULL,ordinal='1/1',updated_at=NOW()
           WHERE publication_id=$1 AND id_pagina_publicacion=ANY($2::text[])`,
          [resolvedId, shiftedSourcePageIds],
        );
      } else {
        await client.query(
          `UPDATE servicios_paginas_revista SET has_content=FALSE,id_contenido=NULL,id_cuenta=NULL,ordinal='1/1',updated_at=NOW()
           WHERE publication_id=$1 AND id_contenido=ANY($2::text[])`,
          [resolvedId, conflictContentIds],
        );
      }
    }

    const content = await client.query("SELECT id_cuenta FROM produccion_contenidos WHERE id_contenido=$1", [data.id_contenido]);
    const accountId = content.rows[0]?.id_cuenta || null;
    const ordered = allPages
      .filter((page) => selectedIds.includes(page.id_pagina_publicacion) || page.id_contenido === data.id_contenido)
      .sort((a, b) => a.pagina_actual - b.pagina_actual);
    for (const [index, page] of ordered.entries()) {
      await client.query(
        `UPDATE servicios_paginas_revista
         SET has_content=TRUE,id_contenido=$1,id_cuenta=$2,ordinal=$3,updated_at=NOW()
         WHERE id_pagina_publicacion=$4 AND publication_id=$5`,
        [data.id_contenido, accountId, `${index + 1}/${ordered.length}`, page.id_pagina_publicacion, resolvedId],
      );
    }
    const shiftedCount = await client.query("SELECT COUNT(*)::int AS value, COALESCE(MAX(pagina_actual), -2)::int AS max_page FROM servicios_paginas_revista WHERE publication_id=$1", [resolvedId]);
    if (shiftedCount.rows[0].value % 2 === 0) {
      const nextPage = shiftedCount.rows[0].max_page + 1;
      await client.query(
        `INSERT INTO servicios_paginas_revista (id_pagina_publicacion,publication_id,pagina_actual,pagina_preferente,tipo)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (publication_id,pagina_actual) DO NOTHING`,
        [pageId(resolvedId, nextPage), resolvedId, nextPage, pagePreference(nextPage), preferredPageType(pagePreference(nextPage))],
      );
    }
    const count = await client.query("SELECT COUNT(*)::int AS value FROM servicios_paginas_revista WHERE publication_id=$1", [resolvedId]);
    await client.query("UPDATE servicios_publicaciones SET num_paginas=$1,updated_at=NOW() WHERE id_publicacion=$2", [count.rows[0].value, resolvedId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return getPaginasPublicacion(resolvedId);
}

export async function insertPagesAfterRow(idPublicacion, data = {}) {
  const pool = getPgPool();
  const resolvedId = await resolvePublicationId(idPublicacion, pool);
  if (!resolvedId) return null;
  const afterPage = Number(data.after_pagina_actual);
  if (!Number.isFinite(afterPage)) throw new Error("Selecciona la fila tras la que insertar paginas.");
  const firstNewPage = afterPage + 1;
  const secondNewPage = afterPage + 2;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const exists = await client.query(
      "SELECT 1 FROM servicios_paginas_revista WHERE publication_id=$1 AND pagina_actual=$2 LIMIT 1",
      [resolvedId, afterPage],
    );
    if (!exists.rows[0]) throw new Error("La fila seleccionada ya no existe.");

    await client.query(
      "UPDATE servicios_paginas_revista SET pagina_actual = pagina_actual + 1000000 WHERE publication_id=$1 AND pagina_actual > $2",
      [resolvedId, afterPage],
    );
    await client.query(
      "UPDATE servicios_paginas_revista SET pagina_actual = pagina_actual - 999998, pagina_preferente = '', updated_at=NOW() WHERE publication_id=$1 AND pagina_actual > $2",
      [resolvedId, afterPage + 1000000],
    );

    for (const pageNumber of [firstNewPage, secondNewPage]) {
      const preference = pagePreference(pageNumber);
      await client.query(
        `INSERT INTO servicios_paginas_revista (id_pagina_publicacion,publication_id,pagina_actual,pagina_preferente,tipo)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (publication_id,pagina_actual) DO NOTHING`,
        [pageId(resolvedId, pageNumber), resolvedId, pageNumber, preference, preferredPageType(preference)],
      );
    }

    const pages = await client.query("SELECT id_pagina_publicacion,pagina_actual FROM servicios_paginas_revista WHERE publication_id=$1 ORDER BY pagina_actual", [resolvedId]);
    for (const page of pages.rows) {
      const preference = pagePreference(page.pagina_actual);
      await client.query(
        "UPDATE servicios_paginas_revista SET pagina_preferente=$1,tipo=$2,updated_at=NOW() WHERE id_pagina_publicacion=$3",
        [preference, preferredPageType(preference), page.id_pagina_publicacion],
      );
    }
    await client.query("UPDATE servicios_publicaciones SET num_paginas=$1,updated_at=NOW() WHERE id_publicacion=$2", [pages.rows.length, resolvedId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return getPaginasPublicacion(resolvedId);
}

export async function deletePublicationPages(idPublicacion, data = {}) {
  const pool = getPgPool();
  const resolvedId = await resolvePublicationId(idPublicacion, pool);
  if (!resolvedId) return null;
  const requestedIds = [...new Set(Array.isArray(data.page_ids) ? data.page_ids : [])];
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: pages } = await client.query("SELECT * FROM servicios_paginas_revista WHERE publication_id=$1 ORDER BY pagina_actual FOR UPDATE", [resolvedId]);
    const indexes = requestedIds.map((id) => pages.findIndex((page) => page.id_pagina_publicacion === id)).filter((index) => index >= 0);
    if (!indexes.length) throw new Error("No hay páginas para eliminar.");
    if (indexes.some((index) => index <= 1 || index === pages.length - 1)) throw new Error("No se puede eliminar la primera, segunda o última página.");
    const affectedContentIds = [...new Set(indexes.map((index) => pages[index].id_contenido).filter(Boolean))];
    if (affectedContentIds.length) {
      await client.query(
        `UPDATE servicios_paginas_revista SET has_content=FALSE,id_contenido=NULL,id_cuenta=NULL,ordinal='1/1',updated_at=NOW()
         WHERE publication_id=$1 AND id_contenido=ANY($2::text[])`,
        [resolvedId, affectedContentIds],
      );
    }
    await client.query("DELETE FROM servicios_paginas_revista WHERE publication_id=$1 AND id_pagina_publicacion=ANY($2::text[])", [resolvedId, requestedIds]);
    const remaining = await client.query("SELECT id_pagina_publicacion FROM servicios_paginas_revista WHERE publication_id=$1 ORDER BY pagina_actual", [resolvedId]);
    await client.query("UPDATE servicios_paginas_revista SET pagina_actual=pagina_actual+100000 WHERE publication_id=$1", [resolvedId]);
    for (const [index, page] of remaining.rows.entries()) {
      await client.query("UPDATE servicios_paginas_revista SET pagina_actual=$1,pagina_preferente=$2,tipo=$3,updated_at=NOW() WHERE id_pagina_publicacion=$4", [index - 1, pagePreference(index - 1), preferredPageType(pagePreference(index - 1)), page.id_pagina_publicacion]);
    }
    let finalCount = remaining.rows.length;
    if (finalCount % 2 === 0) {
      const nextPage = finalCount - 1;
      await client.query(
        `INSERT INTO servicios_paginas_revista (id_pagina_publicacion,publication_id,pagina_actual,pagina_preferente,tipo)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (publication_id,pagina_actual) DO NOTHING`,
        [pageId(resolvedId, nextPage), resolvedId, nextPage, pagePreference(nextPage), preferredPageType(pagePreference(nextPage))],
      );
      finalCount += 1;
    }
    await client.query("UPDATE servicios_publicaciones SET num_paginas=$1,updated_at=NOW() WHERE id_publicacion=$2", [finalCount, resolvedId]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  return getPaginasPublicacion(resolvedId);
}

export async function createRevista(data = {}) {
  data=validatedMagazineDates(data);
  const pool = getPgPool();
  if (!data.id_revista && data.revista && (data.publicacion || data.numero_publicacion)) {
    const existing = await pool.query(`SELECT r.id_revista FROM servicios_revistas r
      JOIN servicios_publicaciones p ON p.revista_id=r.id_revista AND p.tipo_publicacion='revista'
      WHERE lower(btrim(r.revista))=lower(btrim($1)) AND lower(btrim(r.edicion))=lower(btrim($2))
        AND btrim(p.numero_publicacion)=$3 LIMIT 1`,
      [data.revista, data.edicion || '', String(data.publicacion || data.numero_publicacion)]);
    if (existing.rowCount) throw new Error('Ya existe esa revista para la región y el número indicados.');
  }
  const idRevista = data.id_revista?.trim() || `rev_${Date.now()}`;
  const idPublicacion = data.id_publicacion?.trim() || `pub_${idRevista}_${Date.now()}`;

  const { rows } = await pool.query(
    `
      INSERT INTO servicios_revistas (id_revista, edicion, revista, publicacion, deadline_materiales, fecha_publicacion, especial, impresa_o_digital)
      VALUES ($1, $2, $3, '', '', '', $4, $5)
      ON CONFLICT (id_revista) DO UPDATE
      SET edicion = EXCLUDED.edicion,
          revista = EXCLUDED.revista,
          especial = EXCLUDED.especial,
          impresa_o_digital = EXCLUDED.impresa_o_digital,
          updated_at = NOW()
      RETURNING id_revista
    `,
    [idRevista, data.edicion || "", data.revista || "", data.especial || "", data.impresa_o_digital || data.version_publicacion || "digital"],
  );

  await pool.query(
    `
      INSERT INTO servicios_publicaciones (
        id_publicacion,
        nombre_publicacion,
        fecha_publicacion,
        estado_publicacion,
        medio_publicacion,
        edicion_publicacion,
        detalle_publicacion,
        tipo_publicacion,
        revista_id,
        numero_publicacion,
        version_publicacion,
        deadline_materiales,
        fecha_recordatorio
      )
      VALUES ($1, $2, $3, $4, 'revista', $5, $6, 'revista', $7, $8, $9, $10, $11)
      ON CONFLICT (id_publicacion) DO UPDATE
      SET fecha_publicacion = EXCLUDED.fecha_publicacion,
          estado_publicacion = EXCLUDED.estado_publicacion,
          edicion_publicacion = EXCLUDED.edicion_publicacion,
          detalle_publicacion = EXCLUDED.detalle_publicacion,
          tipo_publicacion = EXCLUDED.tipo_publicacion,
          revista_id = EXCLUDED.revista_id,
          numero_publicacion = EXCLUDED.numero_publicacion,
          version_publicacion = EXCLUDED.version_publicacion,
          deadline_materiales = EXCLUDED.deadline_materiales,
          fecha_recordatorio = EXCLUDED.fecha_recordatorio,
          updated_at = NOW()
    `,
    [
      idPublicacion,
      `${data.revista || ""} ${data.edicion || ""} ${data.publicacion || data.numero_publicacion || ""}`.trim(),
      data.fecha_publicacion || "",
      data.estado_publicacion === 'publicada' ? 'publicada' : 'pendiente de publicar',
      data.edicion || "",
      data.revista || "",
      rows[0].id_revista,
      data.publicacion || data.numero_publicacion || "",
      data.impresa_o_digital || data.version_publicacion || "digital",
      data.deadline_materiales || "",
      data.fecha_recordatorio || "",
    ],
  );

  await setNumeroPaginas(idPublicacion, data.num_paginas || 9);

  await updateRevista(rows[0].id_revista,Object.fromEntries(magazineEvents.filter(event=>data[event.key]!==undefined).map(event=>[event.key,data[event.key]])));
  return getRevistaById(rows[0].id_revista);
}

export async function setRevistaPublicationStatus(idRevista, status) {
  if (!['publicada','pendiente de publicar'].includes(status)) throw new Error('Estado de revista no válido');
  const result=await getPgPool().query(`UPDATE servicios_publicaciones SET estado_publicacion=$2,updated_at=now()
    WHERE revista_id=$1 AND tipo_publicacion='revista' RETURNING id_publicacion`,[idRevista,status]);
  if (!result.rowCount) return null;
  return getRevistaById(idRevista);
}

function validatedMagazineDates(data){
  const patch={...data};
  for(const key of ['fecha_publicacion',...magazineEvents.map(event=>event.key)])if(Object.hasOwn(patch,key)){const date=magazineDate(patch[key]);if(date===null){const error=new Error('Fecha no válida: '+key);error.status=400;throw error;}patch[key]=date;}
  return patch;
}
