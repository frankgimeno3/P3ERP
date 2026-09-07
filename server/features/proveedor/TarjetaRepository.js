import Joi from 'joi';
import { randomUUID } from 'node:crypto';
import { getPgPool } from '../../database/pgClient.js';
import { ProveedorError, validateData } from './SupplierAdminRepository.js';

export async function getTarjetas() { return (await getPgPool().query('SELECT * FROM tarjetas ORDER BY tipo,estado,lower(nombre),ultimos_digitos')).rows; }
export async function saveTarjeta(id, body) {
  const data = validateData(Joi.object({ ultimos_digitos:Joi.string().pattern(/^\d{4}$/).required(),nombre:Joi.string().trim().max(200).required(),banco:Joi.string().trim().max(100).required(),tipo:Joi.string().valid('p3','personal').required(),estado:Joi.string().valid('activa','obsoleta').required() }),body);
  const values = [data.ultimos_digitos,data.nombre,data.banco,data.tipo,data.estado,id || randomUUID()];
  const result = await getPgPool().query(id ? 'UPDATE tarjetas SET ultimos_digitos=$1,nombre=$2,banco=$3,tipo=$4,estado=$5,updated_at=NOW() WHERE id_tarjeta=$6 RETURNING *' : 'INSERT INTO tarjetas(ultimos_digitos,nombre,banco,tipo,estado,id_tarjeta) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',values);
  if (!result.rows[0]) throw new ProveedorError('Tarjeta no encontrada.',404);
  return result.rows[0];
}
export async function deleteTarjeta(id) {
  const result = await getPgPool().query('DELETE FROM tarjetas WHERE id_tarjeta=$1 RETURNING id_tarjeta',[id]);
  if (!result.rowCount) throw new ProveedorError('Tarjeta no encontrada.',404);
  return { ok:true };
}
