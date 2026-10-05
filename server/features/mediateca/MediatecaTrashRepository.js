import { randomUUID } from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
export async function archiveMediaDeletion(db, folders, media) {
  const id = randomUUID();
  await db.query('INSERT INTO mediateca_papelera(id,folders,media) VALUES($1,$2::jsonb,$3::jsonb)', [id, JSON.stringify(folders), JSON.stringify(media)]);
  return id;
}
export async function listMediaTrash() {
  return (await getPgPool().query(`SELECT id,deleted_at,jsonb_array_length(folders) folders_count,jsonb_array_length(media) media_count FROM mediateca_papelera WHERE restored_at IS NULL ORDER BY deleted_at DESC`)).rows;
}
export async function restoreMediaTrash(id, canManageFolders = false, pool = getPgPool()) {
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const row = (await db.query('SELECT * FROM mediateca_papelera WHERE id=$1 AND restored_at IS NULL FOR UPDATE', [id])).rows[0];
    if (!row) throw Object.assign(new Error('No existe esta eliminación pendiente de restaurar.'), { status: 404 });
    if (row.folders.length && !canManageFolders) throw Object.assign(new Error('No tienes permiso para restaurar carpetas.'), { status: 403 });
    // All parents are restored in the same statement; FK checks see the complete set.
    if (row.folders.length) await db.query('INSERT INTO mediateca_carpetas SELECT * FROM jsonb_populate_recordset(NULL::mediateca_carpetas,$1::jsonb)', [JSON.stringify(row.folders)]);
    if (row.media.length) await db.query('INSERT INTO mediateca_archivos SELECT * FROM jsonb_populate_recordset(NULL::mediateca_archivos,$1::jsonb)', [JSON.stringify(row.media)]);
    await db.query('UPDATE mediateca_papelera SET restored_at=now() WHERE id=$1', [id]);
    await db.query('COMMIT');
    return { restored: true };
  } catch (error) { await db.query('ROLLBACK'); throw error; } finally { db.release(); }
}
