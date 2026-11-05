import crypto from 'node:crypto';

export async function productionMediaFolder(db, { idRevista = '', tipo = 'otros' } = {}) {
  await db.query("SELECT pg_advisory_xact_lock(hashtext('documentos_revistas_folders'))");
  const child = async (parent, name) => {
    const existing = (await db.query(`SELECT mediateca_folder_id FROM mediateca_carpetas
      WHERE mediateca_parent_folder_id IS NOT DISTINCT FROM $1 AND mediateca_folder_name=$2
      ORDER BY mediateca_folder_created_at LIMIT 1`, [parent, name])).rows[0];
    if (existing) return existing.mediateca_folder_id;
    const id = crypto.randomUUID();
    await db.query('INSERT INTO mediateca_carpetas(mediateca_folder_id,mediateca_parent_folder_id,mediateca_folder_name) VALUES($1,$2,$3)', [id, parent, name]);
    return id;
  };
  const production = await child(null, 'documentos_produccion');
  const root = idRevista ? await child(production, 'documentos_revistas') : production;
  const category = tipo === 'articulos' ? 'material_articulos' : tipo === 'anuncios' ? 'material_anuncios' : 'otros';
  return { id: await child(root, category), path: `documentos_produccion/${idRevista ? 'documentos_revistas/' : ''}${category}` };
}

// Move catalog entries only: S3 object keys and content/material IDs stay valid.
export async function flattenProductionMedia(db) {
  const folders = [];
  for (const idRevista of ['', '__magazine_root__']) for (const tipo of ['articulos', 'anuncios', 'otros']) {
    folders.push(await productionMediaFolder(db, { idRevista, tipo }));
  }
  const tree = (await db.query(`WITH RECURSIVE tree AS (
    SELECT mediateca_folder_id,mediateca_parent_folder_id,mediateca_folder_name,mediateca_folder_name::text path,0 depth
    FROM mediateca_carpetas WHERE mediateca_parent_folder_id IS NULL AND mediateca_folder_name='documentos_produccion'
    UNION ALL SELECT c.mediateca_folder_id,c.mediateca_parent_folder_id,c.mediateca_folder_name,t.path||'/'||c.mediateca_folder_name,t.depth+1
    FROM mediateca_carpetas c JOIN tree t ON c.mediateca_parent_folder_id=t.mediateca_folder_id
  ) SELECT * FROM tree ORDER BY depth DESC`)).rows;
  const keep = new Set(folders.map(f => f.id));
  let removed = 0, moved = 0;
  for (const folder of tree) {
    if (folder.depth === 0 || folder.path === 'documentos_produccion/documentos_revistas' || keep.has(folder.mediateca_folder_id)) continue;
    const revista = folder.path.startsWith('documentos_produccion/documentos_revistas/');
    const tipo = /(?:^|\/)(?:material_)?articulos(?:\/|$)/.test(folder.path) ? 'articulos' : /(?:^|\/)(?:material_)?anuncios(?:\/|$)/.test(folder.path) ? 'anuncios' : 'otros';
    const target = await productionMediaFolder(db, { idRevista: revista ? '__root__' : '', tipo });
    moved += (await db.query('UPDATE mediateca_archivos SET mediateca_folder_id=$1 WHERE mediateca_folder_id=$2', [target.id, folder.mediateca_folder_id])).rowCount;
    removed += (await db.query('DELETE FROM mediateca_carpetas WHERE mediateca_folder_id=$1', [folder.mediateca_folder_id])).rowCount;
  }
  return { removed, moved, folders };
}
