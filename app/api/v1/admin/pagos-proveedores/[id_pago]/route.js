import { NextResponse } from "next/server";
import { getPgPool } from "../../../../../../server/database/pgClient.js";
export async function GET(_request,{params}){const id=(await params).id_pago;const {rows}=await getPgPool().query("SELECT pg.*,p.nombre_proveedor FROM tesoreria_pagos_previstos pg LEFT JOIN administracion_proveedores p USING(id_proveedor) WHERE pg.id_pago=$1",[id]);return rows[0]?NextResponse.json(rows[0]):NextResponse.json({message:"Pago no encontrado"},{status:404})}
