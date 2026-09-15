import { requestActor } from "../../../../../../server/features/comentario/AccountActivity.js";
import { NextResponse } from "next/server";
import { getCustomerInvoice, updateCustomerInvoice } from "../../../../../../server/features/factura/FacturaClienteRepository.js";

export const runtime = "nodejs";
const getId = async (params) => (await params)?.id_factura;
export async function GET(_request, { params }) {
  try {
    const data = await getCustomerInvoice(await getId(params));
    return data ? NextResponse.json(data) : NextResponse.json({ message: "Factura no encontrada" }, { status: 404 });
  } catch (error) { return NextResponse.json({ message: "Error al cargar la factura", detail: error.message }, { status: 500 }); }
}
export async function PUT(request, { params }) {
  try {
    const data = await updateCustomerInvoice(await getId(params), await request.json(), requestActor(request));
    return data ? NextResponse.json(data) : NextResponse.json({ message: "Factura no encontrada" }, { status: 404 });
  } catch (error) { return NextResponse.json({ message: "Error al guardar la factura", detail: error.message }, { status: 400 }); }
}
