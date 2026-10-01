import { getPgPool } from '../../database/pgClient.js';
import { getFolderPathById, normalizeMediatecaRouteSegment } from '../mediateca/MediatecaRepository.js';
import { ensureSignedContractFolder } from '../mediateca/MediatecaStructure.js';
import { assertObjectExistsInS3, createPresignedDownload, createPresignedUpload } from '../mediateca/S3Service.js';

async function destination(db, id) {
  const result = await db.query(`SELECT c.id_contrato,c.id_agente_contrato,c.fecha_firma_contrato,c.created_at,c.id_archivo_firmado,
    a.is_empleado_account FROM comercial_contratos c LEFT JOIN agentes_db a ON a.id_agente=c.id_agente_contrato
    WHERE c.id_contrato=$1`, [id]);
  const row = result.rows[0];
  if (!row) throw new Error('Contrato no encontrado');
  if (!row.id_agente_contrato || !row.is_empleado_account) throw new Error('El contrato debe tener un agente empleado');
  const year = String(row.fecha_firma_contrato || '').match(/20\d{2}/)?.[0] || String(new Date(row.created_at).getFullYear());
  return { ...row, year };
}

function checkType(type) {
  if (type === 'application/pdf') return 'pdf';
  if (type.startsWith('image/')) return 'image';
  throw new Error('El contrato firmado debe ser PDF o imagen');
}

export async function getSignedContract(id) {
  const result = await getPgPool().query(`SELECT c.id_archivo_firmado,m.mediateca_content_name,m.mediateca_s3_key
    FROM comercial_contratos c LEFT JOIN mediateca_archivos m ON m.mediateca_content_id=c.id_archivo_firmado
    WHERE c.id_contrato=$1`, [id]);
  if (!result.rows[0]) return null;
  const row = result.rows[0];
  return { uploaded: Boolean(row.mediateca_s3_key), name: row.mediateca_content_name || '', mediaId: row.id_archivo_firmado || null };
}

export async function presignSignedContract(id, type) {
  checkType(type);
  const db = await getPgPool().connect();
  let folderId;
  let contract;
  try {
    await db.query('BEGIN');
    contract = await destination(db,id);
    folderId = await ensureSignedContractFolder(db,contract.id_agente_contrato,contract.year);
    await db.query('COMMIT');
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
  const path = await getFolderPathById(folderId);
  const filename = `${id}.${type === 'application/pdf' ? 'pdf' : type.split('/')[1].replace(/[^a-z0-9]/gi,'') || 'png'}`;
  return createPresignedUpload({ filename, contentType:type, prefix:`mediateca/${path}` });
}

export async function registerSignedContract(id, data, verifyObject = assertObjectExistsInS3) {
  const type = String(data.contentType || '');
  const mediaType = checkType(type);
  const db = await getPgPool().connect();
  try {
    await db.query('BEGIN');
    const contract = await destination(db,id);
    const folderId = await ensureSignedContractFolder(db,contract.id_agente_contrato,contract.year);
    const path = await getFolderPathById(folderId);
    const mediaId = String(data.mediaId || '');
    const key = String(data.s3Key || '');
    const prefix = `mediateca/${path}/${mediaId}/${normalizeMediatecaRouteSegment(id)}.`;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mediaId)
      || !key.startsWith(prefix) || key.slice(prefix.length).includes('/')) throw new Error('Archivo fuera de la carpeta del contrato');
    await verifyObject(key);
    await db.query(`INSERT INTO mediateca_archivos(mediateca_content_id,mediateca_folder_id,mediateca_content_name,
      mediateca_s3_key,mediateca_content_src,mediateca_content_mime_type,mediateca_content_type)
      VALUES($1,$2,$3,$4,$5,$6,$7)`, [mediaId,folderId,id,key,data.cdnUrl || '',type,mediaType]);
    await db.query('UPDATE comercial_contratos SET id_archivo_firmado=$2,updated_at=now() WHERE id_contrato=$1', [id,mediaId]);
    await db.query('COMMIT');
    return { uploaded:true,name:id,mediaId };
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}

export async function signedContractDownload(id) {
  const result = await getPgPool().query(`SELECT m.mediateca_s3_key FROM comercial_contratos c
    JOIN mediateca_archivos m ON m.mediateca_content_id=c.id_archivo_firmado WHERE c.id_contrato=$1`, [id]);
  if (!result.rows[0]) return null;
  return createPresignedDownload(result.rows[0].mediateca_s3_key);
}
