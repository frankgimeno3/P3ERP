import { canonicalSupplierName, supplierKey } from './supplierNames.js';

const quote = value => `"${value.replaceAll('"', '""')}"`;
export function supplierMergePlan(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!row.nombre_proveedor.trim()) continue;
    const name = canonicalSupplierName(row.nombre_proveedor), key = supplierKey(name);
    if (!groups.has(key)) groups.set(key, { name, rows: [] });
    groups.get(key).rows.push(row);
  }
  return [...groups.values()].map(group => {
    group.rows.sort((a,b) => Number(supplierKey(b.nombre_proveedor) === supplierKey(group.name)) - Number(supplierKey(a.nombre_proveedor) === supplierKey(group.name)) || a.id_proveedor.length - b.id_proveedor.length || a.id_proveedor.localeCompare(b.id_proveedor));
    const target = group.rows[0];
    // For case-only groups keep the spelling of the retained supplier.
    const canonical = canonicalSupplierName(target.nombre_proveedor);
    return { target, name: canonical, sources: group.rows.slice(1) };
  }).filter(group => group.sources.length || group.target.nombre_proveedor !== group.name);
}
export async function supplierReferenceTables(db) {
  const { rows } = await db.query(`SELECT table_name FROM information_schema.columns WHERE table_schema=current_schema() AND column_name='id_proveedor' AND table_name NOT IN ('administracion_proveedores','administracion_historial_fusiones_proveedores') ORDER BY table_name`);
  return rows.map(row => row.table_name);
}
export async function mergeSuppliers(db, onlyNames = null) {
  const tables = await supplierReferenceTables(db);
  await db.query(`LOCK TABLE administracion_proveedores,administracion_historial_fusiones_proveedores${tables.length ? ',' + tables.map(quote).join(',') : ''} IN SHARE ROW EXCLUSIVE MODE`);
  const { rows } = await db.query('SELECT * FROM administracion_proveedores ORDER BY id_proveedor');
  const plan = supplierMergePlan(rows).filter(group => !onlyNames || onlyNames.includes(group.name)), result = [];
  for (const group of plan) {
    const target = { ...group.target }, references = {};
    for (const field of ['nombre_fiscal_proveedor','vat_code','pais_proveedor','moneda_proveedor']) {
      if (!String(target[field] || '').trim()) target[field] = group.sources.find(row => String(row[field] || '').trim())?.[field] || '';
    }
    if (supplierKey(target.nombre_fiscal_proveedor) === supplierKey(group.target.nombre_proveedor)) target.nombre_fiscal_proveedor = group.name;
    for (const source of group.sources) {
      const backup = {};
      for (const table of tables) {
        const original = await db.query(`SELECT to_jsonb(t) AS data FROM ${quote(table)} t WHERE id_proveedor=$1`, [source.id_proveedor]);
        if (original.rowCount) backup[table] = original.rows.map(row => row.data);
        const updated = await db.query(`UPDATE ${quote(table)} SET id_proveedor=$1 WHERE id_proveedor=$2`, [target.id_proveedor,source.id_proveedor]);
        references[table] = (references[table] || 0) + updated.rowCount;
      }
      await db.query('INSERT INTO administracion_historial_fusiones_proveedores(id_anterior,id_proveedor,datos_anteriores,datos_destino_anteriores,referencias_anteriores) VALUES ($1,$2,$3,$4,$5)', [source.id_proveedor,target.id_proveedor,JSON.stringify(source),JSON.stringify(group.target),JSON.stringify(backup)]);
      await db.query('UPDATE administracion_historial_fusiones_proveedores SET id_proveedor=$1 WHERE id_proveedor=$2', [target.id_proveedor,source.id_proveedor]);
      await db.query('DELETE FROM administracion_proveedores WHERE id_proveedor=$1', [source.id_proveedor]);
    }
    if (group.target.nombre_proveedor !== group.name) {
      await db.query('INSERT INTO administracion_historial_fusiones_proveedores(id_anterior,id_proveedor,datos_anteriores,datos_destino_anteriores) VALUES ($1,$1,$2,$2) ON CONFLICT(id_anterior) DO NOTHING', [target.id_proveedor,JSON.stringify(group.target)]);
    }
    await db.query('UPDATE administracion_proveedores SET nombre_proveedor=$1,nombre_fiscal_proveedor=$2,vat_code=$3,pais_proveedor=$4,moneda_proveedor=$5,updated_at=NOW() WHERE id_proveedor=$6', [group.name,target.nombre_fiscal_proveedor,target.vat_code,target.pais_proveedor,target.moneda_proveedor,target.id_proveedor]);
    result.push({ proveedor: group.name, id: target.id_proveedor, eliminados: group.sources.length, referencias: references });
  }
  return result;
}
