import { randomUUID } from 'node:crypto';
import Joi from 'joi';
import { getPgPool } from '@/server/database/pgClient.js';
import { findSupplier, validateData, adminError } from '@/server/features/proveedor/SupplierAdminRepository.js';
export const runtime = 'nodejs';
export async function GET(request,{params}) {
  try {const supplier=await findSupplier((await params).id_proveedor);return Response.json((await getPgPool().query('SELECT * FROM administracion_benchmark_proveedores WHERE id_proveedor=$1 ORDER BY created_at DESC',[supplier.id_proveedor])).rows);}catch(e){return adminError(e);}
}
export async function POST(request,{params}) {
  try {
    const supplier=await findSupplier((await params).id_proveedor);
    const d=validateData(Joi.object({servicio:Joi.string().trim().max(300).required(),descripcion:Joi.string().max(30000).allow('').default(''),unidad:Joi.string().trim().max(100).required(),precio_por_unidad:Joi.number().min(0).max(9999999999.99).precision(2).required()}),await request.json());
    return Response.json((await getPgPool().query('INSERT INTO administracion_benchmark_proveedores(id,id_proveedor,servicio,descripcion,unidad,precio_por_unidad) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[randomUUID(),supplier.id_proveedor,d.servicio,d.descripcion,d.unidad,d.precio_por_unidad])).rows[0],{status:201});
  }catch(e){return adminError(e);}
}
