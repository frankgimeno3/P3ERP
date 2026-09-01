import { NextResponse } from "next/server";
import { getPgPool } from "../../../../../../server/database/pgClient.js";

export async function GET(_request, { params }) {
  const id = (await params).id_pago;
  const { rows } = await getPgPool().query("SELECT pg.*,p.nombre_proveedor FROM pagos_db pg LEFT JOIN proveedores_db p USING(id_proveedor) WHERE id_pago=$1", [id]);
  return rows[0] ? NextResponse.json(rows[0]) : NextResponse.json({ message: "Gasto no encontrado" }, { status: 404 });
}

export async function PUT(request, { params }) {
  try {
    const id = (await params).id_pago;
    const body = await request.json();
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(body.fecha_pago || "") || !["recibo", "transferencia", "pagaré"].includes(body.forma_pago) || !["Sabadell", "Santander"].includes(body.cuenta_pago) || !(Number(body.total_pago) > 0)) return NextResponse.json({ message: "Revisa fecha, forma, banco e importe" }, { status: 400 });
    const { rows } = await getPgPool().query(`UPDATE pagos_db SET id_proveedor=$1,id_factura_proveedor=$2,fecha_pago=$3,bi_pago=$4,total_pago=$5,forma_pago=$6,cuenta_pago=$7,nombre_planificacion=$8,descripcion_planificacion=$9,comentarios=$10,updated_at=NOW() WHERE id_pago=$11 RETURNING *`,
      [body.id_proveedor || null, body.id_factura_proveedor || null, body.fecha_pago, Number(body.bi_pago || body.total_pago), Number(body.total_pago), body.forma_pago, body.cuenta_pago, body.nombre_planificacion || "", body.descripcion_planificacion || "", body.comentarios || "", id]);
    return rows[0] ? NextResponse.json(rows[0]) : NextResponse.json({ message: "Gasto no encontrado" }, { status: 404 });
  } catch (error) {
    console.error("Error updating planned expense:", error);
    return NextResponse.json({ message: "No se ha podido actualizar el gasto" }, { status: 500 });
  }
}
