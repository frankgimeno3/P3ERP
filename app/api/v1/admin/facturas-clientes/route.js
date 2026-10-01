import { requestActor } from "../../../../../server/features/comentario/AccountActivity.js";
import { NextResponse } from "next/server";
import { createInvoiceDraft, createOrderInvoiceDraft, getCustomerInvoices } from "../../../../../server/features/factura/FacturaClienteRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const estado = new URL(request.url).searchParams.get("estado") || "";
    const facturas = await getCustomerInvoices({ estado });
    return NextResponse.json(facturas);
  } catch (error) {
    console.error("Error in GET /api/v1/admin/facturas-clientes:", error);
    return NextResponse.json(
      { message: "Error al cargar las facturas de clientes", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body?.id_contrato && !body?.id_orden) return NextResponse.json({ message: "Indica un contrato o una orden" }, { status: 400 });
    return NextResponse.json(body.id_orden ? await createOrderInvoiceDraft(body.id_orden,requestActor(request)) : await createInvoiceDraft(body.id_contrato, requestActor(request)), { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Error al iniciar la factura", detail: error.message }, { status: 400 });
  }
}
