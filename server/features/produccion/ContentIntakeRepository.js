import { getPgPool } from '../../database/pgClient.js';
import { allocateContentIdentifier } from '../identifiers/BusinessIdentifiers.js';
import { testMode } from '../identifiers/TestMode.js';
import { createPresignedUpload, assertObjectExistsInS3 } from '../mediateca/S3Service.js';
import { externalUserEvent } from '../userEvents/ExternalUserEvents.js';
import { productionMediaFolder } from './ProductionMediaFolders.js';
import { addProductionMaterial, getContentMagazineOptions } from './GestionesProduccionRepository.js';
import { contentTypes, contentPending, materialType, validateContentIntake, validateIntakeFiles } from '../../../app/lib/productionManagement.js';
import {validateContentMagazineFormat} from '../../../app/lib/contentMagazineFormat.js';
import {getRevistaById} from '../revista/RevistaRepository.js';

const invalid = message => Object.assign(new Error(message), { status: 400 });

export async function getContentIntakeOptions({ id_cuenta, id_contrato, tipo, id_contenido }) {
  const db = getPgPool();
  const contracts = id_cuenta ? (await db.query('SELECT id_contrato,nombre_contrato FROM comercial_contratos WHERE id_cuenta_contrato=$1 ORDER BY created_at DESC', [id_cuenta])).rows : [];
  const contents = id_contrato && contracts.some(row => row.id_contrato === id_contrato) ? (await db.query(`SELECT c.* FROM produccion_contenidos c
    JOIN comercial_contratos ct ON ct.id_contrato=$1
    WHERE (c.id_contrato=ct.id_contrato OR EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(ct.array_contenidos,'[]'::jsonb)) item WHERE item->>'id_contenido'=c.id_contenido))
    AND (c.id_cuenta IS NULL OR c.id_cuenta=$2) ORDER BY c.id_contenido`, [id_contrato, id_cuenta])).rows.filter(row => contentPending(row) && contentTypes(row).includes(tipo)) : [];
  const magazines = id_contenido && contents.some(row => row.id_contenido === id_contenido) && tipo !== 'otro' ? await getContentMagazineOptions(id_contenido) : [];
  return { contracts, contents: contents.map(row => ({ id_contenido: row.id_contenido, nombre_contenido: row.nombre_contenido || row.especificaciones_contenido || row.id_contenido })), magazines };
}

export async function validateContentSelection(data, db = getPgPool()) {
  const errors = validateContentIntake(data);
  if (errors.length) throw invalid(errors.join(' '));
  let content = null, account = null;
  if (data.id_cuenta && !data.sin_empresa) {
    account = (await db.query('SELECT id_cuenta,nombre_empresa FROM comercial_cuentas WHERE id_cuenta=$1', [data.id_cuenta])).rows[0];
    if (!account) throw invalid('Selecciona una cuenta válida.');
  }
  if (data.contratado) {
    if (!account) throw invalid('Selecciona la empresa del contrato.');
    const contract = (await db.query('SELECT id_contrato,id_cuenta_contrato,array_contenidos FROM comercial_contratos WHERE id_contrato=$1', [data.id_contrato])).rows[0];
    if (!contract || contract.id_cuenta_contrato !== account.id_cuenta) throw invalid('El contrato no pertenece a la empresa seleccionada.');
    content = (await db.query('SELECT * FROM produccion_contenidos WHERE id_contenido=$1', [data.id_contenido])).rows[0];
    const inContract = contract.array_contenidos?.some(item => item.id_contenido === data.id_contenido);
    if (!content || (content.id_contrato !== contract.id_contrato && !inContract)) throw invalid('El contenido no pertenece al contrato seleccionado.');
    if (content.id_cuenta && content.id_cuenta !== account.id_cuenta) throw invalid('El contenido pertenece a otra cuenta.');
    if (!contentPending(content)) throw invalid('El contenido ya está publicado o cancelado.');
    if (!contentTypes(content).includes(data.tipo)) throw invalid('El contenido contratado no corresponde al tipo seleccionado.');
  }
  let magazine = null;
  if (data.id_revista) {
    magazine = await getRevistaById(data.id_revista);
    if (!magazine) throw invalid('Selecciona una revista válida.');
    if (content) {
      const options = await getContentMagazineOptions(content.id_contenido);
      if (!options.some(row => row.id_revista === magazine.id_revista)) throw invalid('La revista no está vinculada al contenido contratado.');
    }
  } else if (data.contratado && data.tipo !== 'otro') {
    const options = await getContentMagazineOptions(content.id_contenido);
    if (options.length) throw invalid('Selecciona la revista de este contenido contratado.');
  }
  if(data.formato_revista!==undefined)validateContentMagazineFormat(data.formato_revista);
  return { content, account, magazine };
}

export async function validateContentUpload(data) {
  const selection = await validateContentSelection(data);
  const errors = validateIntakeFiles(data.materiales, data.modo);
  if (errors.length) throw invalid(errors.join(' '));
  return { ok: true, nombre: selection.content?.nombre_contenido || selection.content?.especificaciones_contenido || data.nombre, cuenta: selection.account?.nombre_empresa || 'Sin empresa', revista: selection.magazine || null };
}

export async function presignContentIntake(data) {
  await validateContentUpload(data);
  const db = await getPgPool().connect();
  let folder;
  try {
    await db.query('BEGIN');
    folder = await productionMediaFolder(db, { idRevista: data.id_revista, tipo: materialType(data.tipo) });
    await db.query('COMMIT');
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
  const files = [];
  for (const file of data.materiales) files.push({ ...await createPresignedUpload({ filename: file.filename, contentType: file.contentType, prefix: `mediateca/${folder.path}` }) });
  return { files };
}

export async function completeContentIntake(data, verifyObject = assertObjectExistsInS3) {
  if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(data.id_carga || '')) throw invalid('Identificador de subida no válido.');
  const errors = [...validateContentIntake(data), ...validateIntakeFiles(data.materiales, data.modo)];
  if (errors.length) throw invalid(errors.join(' '));
  const db = await getPgPool().connect();
  let result, created = false;
  try {
    await db.query('BEGIN');
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['production-intake:' + data.id_carga]);
    const previous = (await db.query('SELECT id_contenido FROM produccion_cargas_materiales WHERE id_carga=$1', [data.id_carga])).rows[0];
    if (previous) {
      await db.query('COMMIT');
      return previous;
    }
    if (data.contratado) await db.query('SELECT id_contenido FROM produccion_contenidos WHERE id_contenido=$1 FOR UPDATE', [data.id_contenido]);
    const { content, account, magazine } = await validateContentSelection(data, db);
    const folder = await productionMediaFolder(db, { idRevista: magazine?.id_revista, tipo: materialType(data.tipo) });
    for (const file of data.materiales) {
      if (!/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(file.mediaId || '') || !file.s3Key?.startsWith(`mediateca/${folder.path}/${file.mediaId}/`) || file.s3Key.slice(`mediateca/${folder.path}/${file.mediaId}/`.length).includes('/')) throw invalid('Archivo fuera de la carpeta de destino.');
      await verifyObject(file.s3Key, file);
    }
    let id = content?.id_contenido;
    if (!id) {
      const esPrueba = await testMode(db, { accountId: account?.id_cuenta });
      id = await allocateContentIdentifier(db, '', esPrueba);
      await db.query(`INSERT INTO produccion_contenidos(id_contenido,nombre_contenido,descripcion_contenido,especificaciones_contenido,tipo_contenido,
        id_cuenta,cliente_hoja,destino_revista,id_publicacion,contenido_especifico_id,estado_contenido,estado_material_contenido,hoja_prod,es_prueba,formato_revista)
        VALUES($1,$2,$3,$3,$4,$5,$6,$7,$8,$9,'Pendiente de publicar','no revisado produccion',true,$10,$11)`,
      [id, String(data.nombre).trim(), String(data.descripcion || '').trim(), data.tipo, account?.id_cuenta || null, account?.nombre_empresa || '', Boolean(magazine), magazine?.id_publicacion || null, magazine?.id_publicacion || '', esPrueba,data.formato_revista||'impreso_digital']);
      if (magazine) await db.query('INSERT INTO produccion_revistas_contenidos(id_revista,id_contenido,tipo) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [magazine.id_revista, id, materialType(data.tipo)]);
    }
    for (const file of data.materiales) await addProductionMaterial({ ...file, id_contenido: id, id_revista: magazine?.id_revista || '', tipo: materialType(data.tipo) }, async () => {}, db);
    await db.query('INSERT INTO produccion_cargas_materiales(id_carga,id_contenido) VALUES($1,$2)', [data.id_carga, id]);
    await db.query('COMMIT');
    result = { id_contenido: id }; created = true;
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
  if (created) for (const file of data.materiales) await externalUserEvent('crear', 's3_material_produccion', file.mediaId, null, { s3Key: file.s3Key, nombre: file.nombre_material, contenido: result.id_contenido, size: file.size });
  return result;
}
