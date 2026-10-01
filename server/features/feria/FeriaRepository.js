import { getPgPool } from "../../database/pgClient.js";
import {randomUUID} from 'node:crypto';

function normalizeFeria(row) {
  return {
    id_feria: row.id_feria,
    id_feria_base: row.id_feria_base ?? "",
    titulo_especifico_edicion: row.titulo_especifico_edicion ?? "",
    nombre_feria: row.nombre_feria ?? "",
    id_cuenta_feria: row.id_cuenta_feria ?? "",
    id_cuenta_gestion: row.id_cuenta_gestion ?? "",
    pais: row.pais ?? "",
    ciudad: row.ciudad ?? "",
    edicion_numero: row.edicion_numero ?? "",
    hay_intercambio: Boolean(row.hay_intercambio),
    id_contrato: row.id_contrato ?? "",
    hay_especial: Boolean(row.hay_especial),
    es_relevante: Boolean(row.es_relevante),
    descripcion: row.descripcion ?? "",
    text_area_comentarios: row.text_area_comentarios ?? "",
    estado_vuelos: row.estado_vuelos ?? "",
    estado_hotel: row.estado_hotel ?? "",
    estado_stand: row.estado_stand ?? "",
    estado_material: row.estado_material ?? "",
    estado_transporte_revistas: row.estado_transporte_revistas ?? "",
    estado_pases: row.estado_pases ?? "",
    textarea_gestion_evento: row.textarea_gestion_evento ?? "",
    fecha_incio: row.fecha_incio ?? "",
    fecha_finalizacion: row.fecha_finalizacion ?? "",
    periodicidad: row.periodicidad ?? "",
    tematica: row.tematica ?? "",
    fecha_texto_original: row.fecha_texto_original ?? "",
    fecha_inicio: row.fecha_inicio ?? null,
    fecha_fin: row.fecha_fin ?? null,
    fuente_importacion: row.fuente_importacion ?? "",
    fuente_fila: row.fuente_fila ?? null,
    en_vidrioperfil: Boolean(row.en_vidrioperfil),
    id_revista_especial: row.id_revista_especial ?? "",
    id_propuesta_intercambio: row.id_propuesta_intercambio ?? "",
    estado_intercambio: row.estado_intercambio ?? "",
    ...Object.fromEntries(['intercambio_detalle','vuelos_detalle','transporte_detalle','transporte_revistas_detalle','stand_detalle','material_feria_detalle','acreditaciones_detalle','propuestas_asociadas_detalle','contratos_asociados_detalle','cuentas_asociadas_detalle'].map(key=>[key,row[key] ?? ''])),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function markFeriasRelevant(ids = []) {
  const uniqueIds = [...new Set((Array.isArray(ids) ? ids : []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (!uniqueIds.length) return [];
  const { rows } = await getPgPool().query(
    `UPDATE administracion_ferias_ediciones
     SET es_relevante = true, updated_at = NOW()
     WHERE id_feria = ANY($1::text[])
     RETURNING *`,
    [uniqueIds],
  );
  return rows.map(normalizeFeria);
}

function isoFromLegacyDate(value) {
  const match = String(value || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : "";
}

export async function getFerias() {
  const pool = getPgPool();
  const { rows } = await pool.query(`
    SELECT e.*,b.nombre_feria AS nombre_feria,b.pais AS pais,b.periodicidad AS periodicidad,b.tematica AS tematica
    FROM administracion_ferias_ediciones e LEFT JOIN administracion_ferias_db b ON b.id_feria=e.id_feria_base
    ORDER BY COALESCE(e.fecha_inicio, to_date(NULLIF(e.fecha_incio, ''), 'DD/MM/YYYY')) ASC NULLS LAST, b.nombre_feria ASC, e.id_feria ASC
  `);

  return rows.map(normalizeFeria);
}

export async function getFeriaById(idFeria) {
  const pool = getPgPool();
  const { rows } = await pool.query(
    `
      SELECT e.*,b.nombre_feria AS nombre_feria,b.pais AS pais,b.periodicidad AS periodicidad,b.tematica AS tematica
      FROM administracion_ferias_ediciones e LEFT JOIN administracion_ferias_db b ON b.id_feria=e.id_feria_base
      WHERE e.id_feria = $1
      LIMIT 1
    `,
    [idFeria],
  );

  return rows[0] ? normalizeFeria(rows[0]) : null;
}

export async function createFeria(data = {}) {
  const pool = getPgPool();
  const idFeria = data.id_feria?.trim() || `feria_${randomUUID()}`;
  const base=(await pool.query('SELECT * FROM administracion_ferias_db WHERE id_feria=$1',[data.id_feria_base || ''])).rows[0];
  if(!base)throw Object.assign(new Error('Selecciona una feria del catálogo.'),{status:400});
  const { rows } = await pool.query(
    `
      INSERT INTO administracion_ferias_ediciones (
        id_feria,
        id_feria_base,
        titulo_especifico_edicion,
        ciudad,
        edicion_numero,
        fecha_incio,
        fecha_finalizacion,
        hay_intercambio,
        id_contrato,
        hay_especial,
        en_vidrioperfil,
        descripcion,
        id_revista_especial,
        id_propuesta_intercambio,
        estado_intercambio
        ,fecha_texto_original
        ,fecha_inicio
        ,fecha_fin
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NULLIF($17,'')::date, NULLIF($18,'')::date)
      RETURNING *
    `,
    [
      idFeria,
      base.id_feria,
      data.titulo_especifico_edicion || "",
      data.ciudad || "",
      data.edicion_numero || "",
      data.fecha_incio || "",
      data.fecha_finalizacion || "",
      Boolean(data.hay_intercambio),
      data.id_contrato || "",
      Boolean(data.hay_especial),
      Boolean(data.en_vidrioperfil),
      data.descripcion || "",
      data.id_revista_especial || "",
      data.id_propuesta_intercambio || "",
      data.estado_intercambio || "",
      data.fecha_texto_original || "",
      data.fecha_inicio || isoFromLegacyDate(data.fecha_incio),
      data.fecha_fin || isoFromLegacyDate(data.fecha_finalizacion),
    ],
  );

  return getFeriaById(rows[0].id_feria);
}

export async function getFeriaCatalog() {
  return (await getPgPool().query('SELECT * FROM administracion_ferias_db ORDER BY nombre_feria')).rows;
}

export async function getFeriaCatalogById(id) {
  return (await getPgPool().query('SELECT * FROM administracion_ferias_db WHERE id_feria=$1',[id])).rows[0]||null;
}

export async function createFeriaCatalog(data={}) {
  const nombre=String(data.nombre_feria||'').trim();
  if(!nombre)throw Object.assign(new Error('El nombre de la feria es obligatorio.'),{status:400});
  const {rows}=await getPgPool().query(`INSERT INTO administracion_ferias_db(id_feria,nombre_feria,pais,periodicidad,tematica,descripcion)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[`feria_base_${randomUUID()}`,nombre,data.pais||'',data.periodicidad||'',data.tematica||'',data.descripcion||'']);
  return rows[0];
}

const detailFields=['intercambio_detalle','vuelos_detalle','transporte_detalle','transporte_revistas_detalle','stand_detalle','material_feria_detalle','acreditaciones_detalle','propuestas_asociadas_detalle','contratos_asociados_detalle','cuentas_asociadas_detalle'];
export async function updateFeriaEditionDetails(idFeria,data={}) {
  const fields=detailFields.filter(field=>Object.hasOwn(data,field));
  if(!fields.length)return getFeriaById(idFeria);
  const values=fields.map(field=>String(data[field]||''));
  const sets=fields.map((field,index)=>`${field}=$${index+2}`).join(',');
  const result=await getPgPool().query(`UPDATE administracion_ferias_ediciones SET ${sets},updated_at=now() WHERE id_feria=$1 RETURNING id_feria`,[idFeria,...values]);
  return result.rowCount?getFeriaById(idFeria):null;
}
