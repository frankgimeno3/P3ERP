import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getPgPool } from "../../../../../server/database/pgClient.js";

export const runtime = "nodejs";

export async function GET() {
  const { rows } = await getPgPool().query(`SELECT pg.*, p.nombre_proveedor FROM tesoreria_pagos_previstos pg LEFT JOIN administracion_proveedores p USING(id_proveedor) ORDER BY to_date(NULLIF(pg.fecha_pago,''),'DD/MM/YYYY') ASC NULLS LAST, pg.id_pago`);
  return NextResponse.json(rows);
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(body.fecha_pago || "")) return NextResponse.json({ message: "Fecha no válida" }, { status: 400 });
    if (!["recibo", "transferencia", "pagaré"].includes(body.forma_pago)) return NextResponse.json({ message: "Forma de pago no válida" }, { status: 400 });
    if (!["Sabadell", "Santander"].includes(body.cuenta_pago)) return NextResponse.json({ message: "Selecciona Sabadell o Santander" }, { status: 400 });
    if (!(Number(body.total_pago) > 0)) return NextResponse.json({ message: "El importe debe ser mayor que cero" }, { status: 400 });
    const id = `pag_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
    const { rows } = await getPgPool().query(`INSERT INTO tesoreria_pagos_previstos (id_pago,id_proveedor,id_factura_proveedor,fecha_pago,bi_pago,total_pago,forma_pago,cuenta_pago,nombre_planificacion,descripcion_planificacion,comentarios) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [id, body.id_proveedor || null, body.id_factura_proveedor || null, body.fecha_pago, Number(body.bi_pago || body.total_pago), Number(body.total_pago), body.forma_pago, body.cuenta_pago, body.nombre_planificacion || "", body.descripcion_planificacion || "", body.comentarios || ""]);
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("Error creating planned expense:", error);
    return NextResponse.json({ message: "No se ha podido crear el gasto previsto" }, { status: 500 });
  }
}
