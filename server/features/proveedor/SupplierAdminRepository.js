import Joi from 'joi';
import { randomUUID } from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
import { canonicalSupplierName, supplierKey } from './supplierNames.js';
import { supplierReferenceTables } from './SupplierMerge.js';
import { isSupplierCountry } from '../../../app/data/supplierCountries.js';

export class ProveedorError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function adminError(error) {
  const status = error.status || (['23505','23503'].includes(error.code) ? 409 : ['23514','22P02'].includes(error.code) || error instanceof SyntaxError ? 400 : 500);
  return Response.json({ message: error.code === '23505' ? 'Ya existe un registro con ese nombre o esos datos.' : error.code === '23503' ? 'El registro está relacionado con otros datos y no se puede eliminar.' : status === 500 ? 'No se pudo completar la operación.' : error.message }, { status });
}
export async function supplierTransaction(callback) {
  const db = await getPgPool().connect();
  try { await db.query('BEGIN'); const result = await callback(db); await db.query('COMMIT'); return result; }
  catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { db.release(); }
}
export function validateData(schema, body) {
  const result = schema.validate(body);
  if (result.error) throw new ProveedorError(`Revisa el campo ${result.error.details[0].path.join('.')}.`);
  return result.value;
}
export const realDate = () => Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((value, helpers) => {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== value ? helpers.error('any.invalid') : value;
}).required();
export function supplierData(body, creating = false) {
  const field = () => creating ? Joi.string().trim().max(300).required() : Joi.string().trim().max(300).allow('').default('');
  const value = validateData(Joi.object({
    nombre_proveedor: Joi.string().trim().max(300).required(), nombre_fiscal_proveedor: field(),
    vat_code: field(), pais_proveedor: field(), moneda_proveedor: creating ? Joi.string().trim().uppercase().pattern(/^[A-Z]{3}$/).required() : Joi.string().trim().uppercase().pattern(/^[A-Z]{3}$/).allow('').default(''),
  }), body);
  value.nombre_proveedor = canonicalSupplierName(value.nombre_proveedor);
  return value;
}
export async function findSupplier(id, db = getPgPool()) {
  const clean = String(id || '').replace(/,+$/, '');
  const { rows } = await db.query(`SELECT * FROM proveedores_db WHERE id_proveedor=$1 UNION ALL SELECT p.* FROM proveedores_db p JOIN proveedores_unificados u ON p.id_proveedor=u.id_proveedor WHERE u.id_anterior=$1 LIMIT 1`, [clean]);
  if (!rows[0]) throw new ProveedorError('Proveedor no encontrado.',404);
  return rows[0];
}
export async function createOrFindSupplier(db, body) {
  const data = supplierData(body,true), key = supplierKey(data.nombre_proveedor);
  await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`proveedor:${key}`]);
  const { rows } = await db.query("SELECT * FROM proveedores_db WHERE lower(regexp_replace(btrim(nombre_proveedor),'[[:space:]]+',' ','g'))=$1", [key]);
  if (rows[0]) return rows[0];
  const created = await db.query('INSERT INTO proveedores_db(id_proveedor,nombre_proveedor,nombre_fiscal_proveedor,vat_code,pais_proveedor,moneda_proveedor) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [`prov_${randomUUID().replaceAll('-','')}`,data.nombre_proveedor,data.nombre_fiscal_proveedor,data.vat_code,data.pais_proveedor,data.moneda_proveedor]);
  return created.rows[0];
}
export async function createSupplier(body) {
  const data = supplierData(body);
  if (!isSupplierCountry(data.pais_proveedor)) throw new ProveedorError('Selecciona un país del listado.');
  if (!data.moneda_proveedor) throw new ProveedorError('Indica la moneda del proveedor.');
  return supplierTransaction(async db => {
    // Serialize creation with other supplier writers and recheck duplicates at save time.
    await db.query('LOCK TABLE proveedores_db IN SHARE ROW EXCLUSIVE MODE');
    const { rows } = await db.query("SELECT id_proveedor FROM proveedores_db WHERE lower(regexp_replace(btrim(nombre_proveedor),'[[:space:]]+',' ','g'))=$1 OR ($2<>'' AND upper(regexp_replace(vat_code,'[^a-zA-Z0-9]','','g'))=$2) LIMIT 1", [supplierKey(data.nombre_proveedor), data.vat_code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()]);
    if (rows.length) throw new ProveedorError(`Ya existe un proveedor con ese nombre o código fiscal: ${rows[0].id_proveedor}.`, 409);
    return (await db.query('INSERT INTO proveedores_db(id_proveedor,nombre_proveedor,nombre_fiscal_proveedor,vat_code,pais_proveedor,moneda_proveedor) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *', [`prov_${randomUUID().replaceAll('-','')}`,data.nombre_proveedor,data.nombre_fiscal_proveedor,data.vat_code,data.pais_proveedor,data.moneda_proveedor])).rows[0];
  });
}
export async function updateSupplier(id, body) {
  const provider = await findSupplier(id), data = supplierData(body);
  return (await getPgPool().query('UPDATE proveedores_db SET nombre_proveedor=$1,nombre_fiscal_proveedor=$2,vat_code=$3,pais_proveedor=$4,moneda_proveedor=$5,updated_at=NOW() WHERE id_proveedor=$6 RETURNING *', [data.nombre_proveedor,data.nombre_fiscal_proveedor,data.vat_code,data.pais_proveedor,data.moneda_proveedor,provider.id_proveedor])).rows[0];
}
export async function deleteSupplier(id) {
  return supplierTransaction(async db => {
    const provider = await findSupplier(id,db);
    await db.query('SELECT id_proveedor FROM proveedores_db WHERE id_proveedor=$1 FOR UPDATE', [provider.id_proveedor]);
    const tables = await supplierReferenceTables(db);
    for (const table of tables) {
      const count = await db.query(`SELECT 1 FROM "${table.replaceAll('"','""')}" WHERE id_proveedor=$1 LIMIT 1`, [provider.id_proveedor]);
      if (count.rowCount) throw new ProveedorError('No se puede eliminar: el proveedor tiene tickets, facturas, precios, pagos u otros registros asociados.',409);
    }
    await db.query('DELETE FROM proveedores_db WHERE id_proveedor=$1', [provider.id_proveedor]);
    return { ok:true };
  });
}
export async function supplierInvoices(id) {
  return (await getPgPool().query('SELECT * FROM facturas_proveedores_db WHERE id_proveedor=$1 ORDER BY created_at DESC',[id])).rows;
}
export async function supplierCharges(id) {
  return (await getPgPool().query(`SELECT pg.*,COALESCE(NULLIF(f.codigo_factura,''),f.id_factura_proveedor,'') AS factura,
    GREATEST(COALESCE(pg.total_pago,0)-COALESCE(p.pagado,0),0) AS pendiente
    FROM pagos_db pg LEFT JOIN facturas_proveedores_db f ON f.id_factura_proveedor=pg.id_factura_proveedor
    LEFT JOIN (SELECT id_pago,SUM(-importe) AS pagado FROM lineas_bancos WHERE importe<0 GROUP BY id_pago) p ON p.id_pago=pg.id_pago
    WHERE COALESCE(NULLIF(pg.id_proveedor,''),f.id_proveedor)=$1 AND COALESCE(pg.total_pago,0)-COALESCE(p.pagado,0)>0.005
    ORDER BY to_date(NULLIF(pg.fecha_pago,''),'DD/MM/YYYY'),pg.id_pago`, [id])).rows;
}
export async function supplierPrices(id) {
  return (await getPgPool().query('SELECT p.*,p.fecha::text FROM precios_proveedores p WHERE id_proveedor=$1 ORDER BY p.fecha DESC,p.created_at DESC',[id])).rows;
}
export async function saveSupplierPrice(providerId, id, body) {
  const provider = await findSupplier(providerId);
  const data = validateData(Joi.object({ concepto:Joi.string().trim().max(300).required(),importe:Joi.number().min(0).max(9999999999.99).precision(2).required(),moneda:Joi.string().trim().uppercase().pattern(/^[A-Z]{3}$/).required(),fecha:realDate(),comentarios:Joi.string().max(30000).allow('').default('') }),body);
  const values = [data.concepto,data.importe,data.moneda,data.fecha,data.comentarios,provider.id_proveedor,id || randomUUID()];
  const result = await getPgPool().query(id ? 'UPDATE precios_proveedores SET concepto=$1,importe=$2,moneda=$3,fecha=$4,comentarios=$5,updated_at=NOW() WHERE id_proveedor=$6 AND id_precio=$7 RETURNING *' : 'INSERT INTO precios_proveedores(concepto,importe,moneda,fecha,comentarios,id_proveedor,id_precio) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',values);
  if (!result.rows[0]) throw new ProveedorError('Precio no encontrado.',404);
  return result.rows[0];
}
export async function deleteSupplierPrice(providerId,id) {
  const provider = await findSupplier(providerId);
  const result = await getPgPool().query('DELETE FROM precios_proveedores WHERE id_proveedor=$1 AND id_precio=$2 RETURNING id_precio',[provider.id_proveedor,id]);
  if (!result.rowCount) throw new ProveedorError('Precio no encontrado.',404);
  return { ok:true };
}
