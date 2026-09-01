import { NextResponse } from "next/server";
import { updateAdministrativeOrder } from "../../../../../../../server/features/factura/FacturaClienteRepository.js";
import { getOrdenesAdministrativas } from "../../../../../../../server/features/orden/OrdenRepository.js";

export const runtime = "nodejs";
const getId = async (params) => (await params)?.id_orden;
export async function GET(_request, { params }) {
  const id = await getId(params);
  const rows = await getOrdenesAdministrativas({ search: id });
  const row = rows.find((item) => item.id_orden === id);
  return row ? NextResponse.json(row) : NextResponse.json({ message: "Orden no encontrada" }, { status: 404 });
}
export async function PUT(request, { params }) {
  try {
    const row = await updateAdministrativeOrder(await getId(params), await request.json());
    return row ? NextResponse.json(row) : NextResponse.json({ message: "Orden no encontrada" }, { status: 404 });
  } catch (error) { return NextResponse.json({ message: "Error al guardar la orden", detail: error.message }, { status: 400 }); }
}
