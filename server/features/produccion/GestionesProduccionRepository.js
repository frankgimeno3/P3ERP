import crypto from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
import { getRevistas, getRevistaById } from '../revista/RevistaRepository.js';
import { assertObjectExistsInS3, createPresignedUpload } from '../mediateca/S3Service.js';
import {articleMatchesMagazine} from '../../../app/config/editorialMagazine.js';
import {productionMagazineSector} from '../../../app/config/productionMagazineFilters.js';
import { productionMediaFolder } from './ProductionMediaFolders.js';
import { contentTypes as managementContentTypes } from '../../../app/lib/productionManagement.js';
import { externalUserEvent } from '../userEvents/ExternalUserEvents.js';

const states = new Set(['no revisado produccion', 'incidencia', 'ok produccion']);

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
  // Categories are shared by all magazines; never recreate per-magazine trees.
  return revistas || await getRevistas();
}

export function magazineRegion(revista) {
  const edition = String(revista.edicion || '').toLowerCase();
  return /am[eé]rica|latam/.test(edition) ? 'América' : /iberia|espa[nñ]a/.test(edition) ? 'España' : 'Otro';
}

export function magazineSector(revista) {
  return productionMagazineSector(revista);
}

function matchesLegacy(content, revista) {
  const label = String(content.publicacion_num_web || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  const number = String(revista.numero_publicacion || revista.numero || '').trim();
  if (!label || !number) return false;
  const safeNumber = number.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (!new RegExp(`(?:N[ºO°]\\s*|\\b)${safeNumber}$`).test(label)) return false;
  const sector = magazineSector(revista);
  const region = magazineRegion(revista);
  const title = String(revista.revista || '').normalize('NFD').replace(/\p{M}/gu,'').toUpperCase();
  if (/QUIEN ES QUIEN/.test(title)) return /QQ|QUIEN ES QUIEN/.test(label) && (sector==='Vidrio'?/VIDRIO/.test(label):/VENTANA/.test(label));
  if (/HUECO/.test(title)) return /HUECO/.test(label);
  if (sector === 'Vidrio' && !/VIDRIO|\bVP\b/.test(label)) return false;
  if (sector === 'Ventanas' && !/VENTANAS|VPCS/.test(label)) return false;
  if (region === 'España' && !/ESPANA|IBERIA/.test(label)) return false;
  if (region === 'América' && !/LATAM|AMERICA/.test(label)) return false;
  return sector !== 'Otro' && region !== 'Otro';
}

function contentTypes(content) {
  return managementContentTypes(content).filter(type => type !== 'otro').map(type => type === 'articulo' ? 'articulos' : 'anuncios');
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
  const { rows: contents } = await getPgPool().query(`SELECT c.*,cu.nombre_empresa,a.nombre_completo_agente,
    COALESCE(NULLIF(c.id_contrato,''),(SELECT ct.id_contrato FROM comercial_contratos ct
      WHERE ct.array_contenidos @> jsonb_build_array(jsonb_build_object('id_contenido',c.id_contenido)) ORDER BY ct.id_contrato LIMIT 1)) AS id_contrato
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
    WHERE m.id_contenido=ANY($1::text[]) AND (m.id_revista=$2 OR m.id_revista IS NULL) ORDER BY m.fecha_aportado,m.id_material`, [ids, revista.id_revista])).rows : [];
  const finalPages=(await getPgPool().query('SELECT contenido_id,numero_pagina,tipo_pagina FROM contenidos_revistas_db WHERE revista_id=$1 ORDER BY numero_pagina',[revista.id_revista])).rows;
  return { revista: { ...revista, region: magazineRegion(revista), sector: magazineSector(revista) },
    contenidos: matches.map(content => ({ ...content, paginas_definitivas:finalPages.filter(page=>page.contenido_id===content.id_contenido&&(content.tipo==='articulos')===/art[ií]culo/i.test(page.tipo_pagina)).map(page=>page.numero_pagina),materiales: materials.filter(m => m.id_contenido === content.id_contenido && m.tipo === content.tipo) })) };
}

async function materialFolder(db, { idRevista, tipo }) {
  return (await productionMediaFolder(db, { idRevista, tipo })).id;
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
  const tipo = ['articulos', 'anuncios', 'otros'].includes(data.tipo) ? data.tipo : null;
  if (!idContenido || !tipo) throw new Error('Contenido y tipo obligatorios');
  if (idRevista && tipo === 'otros') throw new Error('Otros contenidos no pueden asignarse a revista');
  const content = (await db.query('SELECT * FROM produccion_contenidos WHERE id_contenido=$1 FOR UPDATE', [idContenido])).rows[0];
  if (!content) throw new Error('Contenido no encontrado');
  if (data.es_version_acabada !== undefined && typeof data.es_version_acabada !== 'boolean') throw new Error('Revisa el tipo de material');
  const singular = tipo === 'articulos' ? 'articulo' : tipo === 'anuncios' ? 'anuncio' : 'otro';
  if (!managementContentTypes(content).includes(singular)) throw new Error('El material no corresponde al tipo del contenido');
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

export async function addProductionMaterial(data, verifyObject = assertObjectExistsInS3, transactionDb = null) {
  const db = transactionDb || await getPgPool().connect();
  try {
    if (!transactionDb) await db.query('BEGIN');
    const destination = await validateDestination(db, data);
    const previous = (await db.query('SELECT * FROM produccion_materiales WHERE mediateca_id=$1', [data.mediaId || null])).rows[0];
    if (previous) {
      if (previous.id_contenido !== destination.idContenido || previous.tipo !== destination.tipo || Boolean(previous.es_version_acabada) !== (data.es_version_acabada===true)) throw new Error('El archivo ya pertenece a otro material');
      if (!transactionDb) await db.query('COMMIT');
      return previous;
    }
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
      mediateca_s3_key,mediateca_content_src,mediateca_content_mime_type,mediateca_content_type,mediateca_content_description)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [mediaId,folderId,name,s3Key,'',data.contentType || '',String(data.contentType || '').includes('pdf') ? 'pdf' : String(data.contentType || '').startsWith('image/') ? 'image' : 'file',String(data.descripcion || '')]);
    const id = `material_${crypto.randomUUID().slice(0,12)}`;
    const finished = data.es_version_acabada === true;
    const version = finished ? (await db.query('SELECT COALESCE(max(numero_version),0)+1 AS version FROM produccion_materiales WHERE id_contenido=$1 AND es_version_acabada', [destination.idContenido])).rows[0].version : null;
    const result = await db.query(`INSERT INTO produccion_materiales
      (id_material,nombre_material,validacion_produccion,comentarios,mediateca_id,archivo_url,id_contenido,id_revista,tipo,descripcion_material,fecha_aportado,es_version_acabada,numero_version)
      VALUES($1,$2,'no revisado produccion','',$3,$4,$5,$6,$7,$8,now(),$9,$10) RETURNING *`,
      [id,name,mediaId,'',destination.idContenido,destination.idRevista || null,destination.tipo,String(data.descripcion || ''),finished,version]);
    await db.query(`UPDATE produccion_contenidos SET array_ids_materiales = COALESCE(array_ids_materiales,'[]'::jsonb) || $1::jsonb,
      updated_at=now() WHERE id_contenido=$2`, [JSON.stringify([id]),destination.idContenido]);
    if (destination.idRevista) await db.query(`INSERT INTO produccion_revistas_contenidos(id_revista,id_contenido,tipo)
      VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [destination.idRevista,destination.idContenido,destination.tipo]);
    if (!transactionDb) {
      await db.query('COMMIT');
      await externalUserEvent('crear', 's3_material_produccion', mediaId, null, { s3Key, nombre: name, contenido: destination.idContenido });
    }
    return result.rows[0];
  } catch (error) { if (!transactionDb) await db.query('ROLLBACK'); throw error; }
  finally { if (!transactionDb) db.release(); }
}

export async function reviewProductionMaterial(id, data) {
  const status = String(data.validacion_produccion || '').toLowerCase();
  if (!states.has(status)) throw new Error('Estado de revisión no válido');
  const result = await getPgPool().query(`UPDATE produccion_materiales
    SET validacion_produccion=$2,comentarios=$3,updated_at=now() WHERE id_material=$1 RETURNING *`,
    [id,status,String(data.comentarios || '')]);
  return result.rows[0] || null;
}
