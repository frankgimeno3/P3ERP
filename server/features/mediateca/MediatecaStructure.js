import crypto from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
import { ensureMagazineFolders } from '../produccion/GestionesProduccionRepository.js';

async function child(db, parent, name) {
  const result = await db.query(`SELECT mediateca_folder_id FROM mediateca_carpetas
    WHERE mediateca_parent_folder_id IS NOT DISTINCT FROM $1 AND mediateca_folder_name=$2 LIMIT 1`, [parent, name]);
  if (result.rows[0]) return result.rows[0].mediateca_folder_id;
  const id = crypto.randomUUID();
  await db.query(`INSERT INTO mediateca_carpetas(mediateca_folder_id,mediateca_parent_folder_id,mediateca_folder_name)
    VALUES($1,$2,$3) ON CONFLICT DO NOTHING`, [id,parent,name]);
  const inserted = await db.query(`SELECT mediateca_folder_id FROM mediateca_carpetas
    WHERE mediateca_parent_folder_id IS NOT DISTINCT FROM $1 AND mediateca_folder_name=$2 LIMIT 1`, [parent,name]);
  return inserted.rows[0].mediateca_folder_id;
}

export async function ensureMediatecaStructure() {
  const db = await getPgPool().connect();
  try {
    await db.query('BEGIN');
    await db.query("SELECT pg_advisory_xact_lock(hashtext('mediateca_required_roots'))");
    for (const name of ['documentos_administracion','documentos_direccion','documentos_produccion']) await child(db,null,name);
    const contractsRoot = await child(db,null,'contratos_firmados');
    const result = await db.query(`SELECT DISTINCT a.id_agente,
      CASE WHEN c.id_contrato IS NOT NULL THEN
        COALESCE(substring(c.fecha_firma_contrato FROM '(20[0-9]{2})'),extract(year FROM c.created_at)::text)
      END AS anio
      FROM agentes_db a LEFT JOIN comercial_contratos c ON c.id_agente_contrato=a.id_agente
      WHERE a.is_empleado_account=true`);
    for (const row of result.rows) {
      const agent = await child(db,contractsRoot,row.id_agente);
      if (/^20\d{2}$/.test(row.anio)) await child(db,agent,row.anio);
    }
    await db.query('COMMIT');
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
  await ensureMagazineFolders();
}

export async function ensureSignedContractFolder(db, agentId, year) {
  await db.query("SELECT pg_advisory_xact_lock(hashtext('mediateca_required_roots'))");
  const root = await child(db,null,'contratos_firmados');
  return child(db,await child(db,root,agentId),year);
}
