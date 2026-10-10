import crypto from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
import { getRevistas, getRevistaById } from '../revista/RevistaRepository.js';
import { assertObjectExistsInS3, createPresignedUpload } from '../mediateca/S3Service.js';
import { normalizeMediatecaRouteSegment } from '../mediateca/MediatecaRepository.js';
import {articleMatchesMagazine} from '../../../app/config/editorialMagazine.js';

const states = new Set(['no revisado produccion', 'incidencia', 'ok produccion']);
const clean = value => normalizeMediatecaRouteSegment(value);

async function childFolder(db, parentId, name) {
  const normalized = clean(name);
  if (!normalized) throw new Error('Nombre de carpeta no válido');
  const found = await db.query(`SELECT mediateca_folder_id FROM mediateca_carpetas
    WHERE mediateca_parent_folder_id IS NOT DISTINCT FROM $1 AND mediateca_folder_name=$2
    ORDER BY mediateca_folder_created_at LIMIT 1`, [parentId, normalized]);
  if (found.rows[0]) return found.rows[0].mediateca_folder_id;
  const id = crypto.randomUUID();
  await db.query(`INSERT INTO mediateca_carpetas(mediateca_folder_id,mediateca_folder_name,mediateca_parent_folder_id)
    VALUES($1,$2,$3)`, [id, normalized, parentId]);
  return id;
}

async function folderPath(db, folderId) {
  const names = [];
  let id = folderId;
  while (id) {
    const row = (await db.query('SELECT mediateca_folder_name,mediateca_parent_folder_id FROM mediateca_carpetas WHERE mediateca_folder_id=$1', [id])).rows[0];
    if (!row) throw new Error('Carpeta de mediateca no encontrada');
    names.unshift(row.mediateca_folder_name);
    id = row.mediateca_parent_folder_id;
  }
  return names.join('/');
}

export async function ensureMagazineFolders(revistas = null) {
  const magazines = revistas || await getRevistas();
  if (!magazines.length) return magazines;
  const missing = await getPgPool().query(`SELECT r.id_revista FROM servicios_revistas r
    LEFT JOIN mediateca_carpetas prod ON prod.mediateca_parent_folder_id IS NULL AND prod.mediateca_folder_name='documentos_produccion'
    LEFT JOIN mediateca_carpetas root ON root.mediateca_parent_folder_id=prod.mediateca_folder_id AND root.mediateca_folder_name='documentos_revistas'
    LEFT JOIN mediateca_carpetas folder ON folder.mediateca_parent_folder_id=root.mediateca_folder_id AND folder.mediateca_folder_name=r.id_revista
    LEFT JOIN mediateca_carpetas articles ON articles.mediateca_parent_folder_id=folder.mediateca_folder_id AND articles.mediateca_folder_name='articulos'
    LEFT JOIN mediateca_carpetas ads ON ads.mediateca_parent_folder_id=folder.mediateca_folder_id AND ads.mediateca_folder_name='anuncios'
    WHERE r.id_revista=ANY($1::text[]) AND (folder.mediateca_folder_id IS NULL OR articles.mediateca_folder_id IS NULL OR ads.mediateca_folder_id IS NULL)
    LIMIT 1`, [magazines.map(row => row.id_revista)]);
  if (!missing.rowCount) return magazines;
  const db = await getPgPool().connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('documentos_revistas_folders'))");
    const production = await childFolder(db, null, 'documentos_produccion');
    const root = await childFolder(db, production, 'documentos_revistas');
    for (const revista of magazines) {
      const folder = await childFolder(db, root, revista.id_revista);
      await childFolder(db, folder, 'articulos');
      await childFolder(db, folder, 'anuncios');
    }
    await db.query('COMMIT');
    return magazines;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { db.release(); }
}

export function magazineRegion(revista) {
  const edition = String(revista.edicion || '').toLowerCase();
  return /am[eé]rica|latam/.test(edition) ? 'América' : /iberia|espa[nñ]a/.test(edition) ? 'España' : 'Otro';
}

export function magazineSector(revista) {
  const name = String(revista.revista || '').toLowerCase();
  return name.includes('vidrio') ? 'Vidrio' : name.includes('ventana') ? 'Ventanas' : 'Otro';
}

function matchesLegacy(content, revista) {
  const label = String(content.publicacion_num_web || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  const number = String(revista.numero_publicacion || revista.numero || '').trim();
  if (!label || !number) return false;
  const safeNumber = number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`(?:N[ºO°]\\s*|\\b)${safeNumber}$`).test(label)) return false;
  const sector = magazineSector(revista);
  const region = magazineRegion(revista);
  if (sector === 'Vidrio' && !/VIDRIO|\bVP\b/.test(label)) return false;
  if (sector === 'Ventanas' && !/VENTANAS|VPCS/.test(label)) return false;
  if (region === 'España' && !/ESPANA|IBERIA/.test(label)) return false;
  if (region === 'América' && !/LATAM|AMERICA/.test(label)) return false;
  return sector !== 'Otro' && region !== 'Otro';
}

function contentTypes(content) {
  if (content.tipo_contenido === 'articulo') return ['articulos'];
  if (content.tipo_contenido === 'anuncio') return ['anuncios'];
  const types = [];
  if (!/NO PROCEDE/i.test(content.anuncio_hoja || '')) types.push('anuncios');
  if (!/NO PROCEDE/i.test(content.articulo_hoja || '')) types.push('articulos');
  return types;
}

function matchesEditorial(article, revista) {
  return articleMatchesMagazine(article,revista);
}

export async function getMagazineList() {
  const magazines = await getRevistas();
  return magazines.map(revista => ({ ...revista, region: magazineRegion(revista), sector: magazineSector(revista) }));
}

export async function getContentMagazineOptions(idContenido) {
  const content = (await getPgPool().query('SELECT * FROM produccion_contenidos WHERE id_contenido=$1', [idContenido])).rows[0];
  if (!content) return null;
  const magazines = await getMagazineList();
  const explicit = await getPgPool().query('SELECT DISTINCT id_revista FROM produccion_revistas_contenidos WHERE id_contenido=$1', [idContenido]);
  const linked = new Set(explicit.rows.map(row => row.id_revista));
  const article = (await getPgPool().query(`SELECT revista,espana_previsto_numero,latam_previsto_numero,especial_numero,hueco_previsto
    FROM produccion_control_redaccion WHERE id_contenido=$1`, [idContenido])).rows[0];
  return magazines.filter(revista => linked.has(revista.id_revista)
    || content.id_publicacion === revista.id_publicacion
    || content.contenido_especifico_id === revista.id_publicacion
    || (article && matchesEditorial(article, revista))
    || matchesLegacy(content, revista));
}

export async function getMagazineManagement(idRevista) {
  const revista = await getRevistaById(idRevista);
  if (!revista) return null;
  const number=String(revista.numero_publicacion||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const { rows: contents } = await getPgPool().query(`SELECT c.*,cu.nombre_empresa,a.nombre_completo_agente
    FROM produccion_contenidos c
    LEFT JOIN comercial_cuentas cu ON cu.id_cuenta=c.id_cuenta
    LEFT JOIN agentes_db a ON a.id_agente=c.id_agente
    WHERE c.hoja_prod=true AND (c.id_publicacion=$1 OR c.contenido_especifico_id=$1
      OR EXISTS(SELECT 1 FROM produccion_revistas_contenidos rc WHERE rc.id_contenido=c.id_contenido AND rc.id_revista=$2)
      OR c.publicacion_num_web ~ $3
      OR EXISTS(SELECT 1 FROM produccion_control_redaccion e WHERE e.id_contenido=c.id_contenido))
    ORDER BY c.id_contenido`,[revista.id_publicacion,revista.id_revista,number?`(?:[^0-9]|^)${number}$`:'a^']);
  const links = await getPgPool().query('SELECT id_contenido,tipo FROM produccion_revistas_contenidos WHERE id_revista=$1', [revista.id_revista]);
  const editorials = await getPgPool().query(`SELECT id_contenido,revista,espana_previsto_numero,latam_previsto_numero,especial_numero,hueco_previsto
    FROM produccion_control_redaccion WHERE id_contenido IS NOT NULL`);
  const editorialIds = new Set(editorials.rows.filter(article => matchesEditorial(article, revista)).map(article => article.id_contenido));
  const byContent = new Map();
  for (const link of links.rows) {
    if (!byContent.has(link.id_contenido)) byContent.set(link.id_contenido, new Set());
    byContent.get(link.id_contenido).add(link.tipo);
  }
  const matches = contents.flatMap(content => {
    const direct = content.id_publicacion === revista.id_publicacion || content.contenido_especifico_id === revista.id_publicacion;
    const legacy = matchesLegacy(content, revista);
    const explicit = byContent.get(content.id_contenido);
    if (!direct && !legacy && !explicit && !editorialIds.has(content.id_contenido)) return [];
    return [...(explicit || new Set(editorialIds.has(content.id_contenido) ? ['articulos'] : contentTypes(content)))].map(tipo => ({ ...content, tipo }));
  });
  const ids = [...new Set(matches.map(item => item.id_contenido))];
  const materials = ids.length ? (await getPgPool().query(`SELECT m.* FROM produccion_materiales m
    WHERE m.id_contenido=ANY($1::text[]) AND m.id_revista=$2 ORDER BY m.fecha_aportado,m.id_material`, [ids, revista.id_revista])).rows : [];
  const finalPages=(await getPgPool().query('SELECT contenido_id,numero_pagina,tipo_pagina FROM contenidos_revistas_db WHERE revista_id=$1 ORDER BY numero_pagina',[revista.id_revista])).rows;
  return { revista: { ...revista, region: magazineRegion(revista), sector: magazineSector(revista) },
    contenidos: matches.map(content => ({ ...content, paginas_definitivas:finalPages.filter(page=>page.contenido_id===content.id_contenido&&(content.tipo==='articulos')===/art[ií]culo/i.test(page.tipo_pagina)).map(page=>page.numero_pagina),materiales: materials.filter(m => m.id_contenido === content.id_contenido && m.tipo === content.tipo) })) };
}

async function materialFolder(db, { idContenido, idRevista, tipo }) {
  await db.query("SELECT pg_advisory_xact_lock(hashtext('documentos_revistas_folders'))");
  const production = await childFolder(db, null, 'documentos_produccion');
  if (idRevista) {
    const root = await childFolder(db, production, 'documentos_revistas');
    const revista = await childFolder(db, root, idRevista);
    const category = await childFolder(db, revista, tipo);
    return childFolder(db, category, idContenido);
  }
  const other = await childFolder(db, production, 'otros_contenidos');
  const category = await childFolder(db, other, tipo);
  return childFolder(db, category, idContenido);
}

export async function ensureProductionContentFolders(db, idContenido, idPublicacion = '') {
  const publication = idPublicacion ? (await db.query('SELECT revista_id FROM servicios_publicaciones WHERE id_publicacion=$1', [idPublicacion])).rows[0] : null;
  for (const tipo of ['articulos', 'anuncios']) {
    await materialFolder(db, { idContenido, idRevista: publication?.revista_id || '', tipo });
  }
}

async function validateDestination(db, data) {
  const idContenido = String(data.id_contenido || '').trim();
  const idRevista = String(data.id_revista || '').trim();
  const tipo = data.tipo === 'articulos' ? 'articulos' : data.tipo === 'anuncios' ? 'anuncios' : null;
  if (!idContenido || !tipo) throw new Error('Contenido y tipo obligatorios');
  const content = (await db.query('SELECT id_contenido FROM produccion_contenidos WHERE id_contenido=$1', [idContenido])).rows[0];
  if (!content) throw new Error('Contenido no encontrado');
  if (idRevista && !(await db.query('SELECT 1 FROM servicios_revistas WHERE id_revista=$1', [idRevista])).rowCount) throw new Error('Revista no encontrada');
  return { idContenido, idRevista, tipo };
}

export async function presignProductionMaterial(data) {
  const db = await getPgPool().connect();
  let path;
  try {
    await db.query('BEGIN');
    const destination = await validateDestination(db, data);
    const folderId = await materialFolder(db, destination);
    path = await folderPath(db, folderId);
    await db.query('COMMIT');
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
  const signed = await createPresignedUpload({ filename: data.filename, contentType: data.contentType, prefix: `mediateca/${path}` });
  return { ...signed, folderPath: path };
}

export async function addProductionMaterial(data, verifyObject = assertObjectExistsInS3) {
  const db = await getPgPool().connect();
  try {
    await db.query('BEGIN');
    const destination = await validateDestination(db, data);
    const folderId = await materialFolder(db, destination);
    const path = await folderPath(db, folderId);
    const s3Key = String(data.s3Key || '');
    const mediaId = String(data.mediaId || '');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mediaId)
      || !s3Key.startsWith(`mediateca/${path}/${mediaId}/`)
      || s3Key.slice(`mediateca/${path}/${mediaId}/`.length).includes('/')) {
      throw new Error('Archivo fuera de la carpeta del contenido');
    }
    await verifyObject(s3Key);
    const name = String(data.nombre_material || data.filename || '').trim();
    if (!name) throw new Error('Indica el nombre del material');
    await db.query(`INSERT INTO mediateca_archivos(mediateca_content_id,mediateca_folder_id,mediateca_content_name,
      mediateca_s3_key,mediateca_content_src,mediateca_content_mime_type,mediateca_content_type)
      VALUES($1,$2,$3,$4,$5,$6,$7)`, [mediaId,folderId,clean(name),s3Key,data.cdnUrl || '',data.contentType || '',String(data.contentType || '').includes('pdf') ? 'pdf' : 'image']);
    const id = `material_${crypto.randomUUID().slice(0,12)}`;
    const result = await db.query(`INSERT INTO produccion_materiales
      (id_material,nombre_material,validacion_produccion,comentarios,mediateca_id,archivo_url,id_contenido,id_revista,tipo,fecha_aportado)
      VALUES($1,$2,'no revisado produccion','',$3,$4,$5,$6,$7,now()) RETURNING *`,
      [id,name,mediaId,data.cdnUrl || '',destination.idContenido,destination.idRevista || null,destination.tipo]);
    await db.query(`UPDATE produccion_contenidos SET array_ids_materiales = COALESCE(array_ids_materiales,'[]'::jsonb) || $1::jsonb,
      updated_at=now() WHERE id_contenido=$2`, [JSON.stringify([id]),destination.idContenido]);
    if (destination.idRevista) await db.query(`INSERT INTO produccion_revistas_contenidos(id_revista,id_contenido,tipo)
      VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [destination.idRevista,destination.idContenido,destination.tipo]);
    await db.query('COMMIT');
    return result.rows[0];
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}

export async function reviewProductionMaterial(id, data) {
  const status = String(data.validacion_produccion || '').toLowerCase();
  if (!states.has(status)) throw new Error('Estado de revisión no válido');
  const result = await getPgPool().query(`UPDATE produccion_materiales
    SET validacion_produccion=$2,comentarios=$3,updated_at=now() WHERE id_material=$1 RETURNING *`,
    [id,status,String(data.comentarios || '')]);
  return result.rows[0] || null;
}
