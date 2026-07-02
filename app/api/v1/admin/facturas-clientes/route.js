import { NextResponse } from "next/server";
import { getFacturasClientes } from "../../../../../server/features/factura/FacturaRepository.js";

export const runtime = "nodejs";

export async function GET() {
  try {
    const facturas = await getFacturasClientes();
    return NextResponse.json(facturas);
  } catch (error) {
    console.error("Error in GET /api/v1/admin/facturas-clientes:", error);
    return NextResponse.json(
      { message: "Error al cargar las facturas de clientes", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
