import { NextResponse } from "next/server";
import { emitCustomerInvoice } from "../../../../../../../server/features/factura/FacturaClienteRepository.js";

export const runtime = "nodejs";
export async function POST(request, { params }) {
  try {
    const idFactura = (await params)?.id_factura;
    return NextResponse.json(await emitCustomerInvoice(idFactura, await request.json()));
  } catch (error) {
    return NextResponse.json({ message: "No se pudo emitir la factura", detail: error.message }, { status: 400 });
  }
}
