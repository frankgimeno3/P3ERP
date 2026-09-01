import { NextResponse } from "next/server";
import { createRectifyingInvoiceDraft } from "../../../../../../server/features/factura/FacturaClienteRepository.js";

export const runtime = "nodejs";
export async function POST(request) {
  try {
    const body = await request.json();
    return NextResponse.json(await createRectifyingInvoiceDraft(body?.factura_origen_id, body?.factura_tipo), { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "No se pudo iniciar la factura rectificativa", detail: error.message }, { status: 400 });
  }
}
