import { NextResponse } from "next/server";
import { getFacturasProveedores } from "../../../../../server/features/factura/FacturaRepository.js";

export const runtime = "nodejs";

export async function GET() {
  try {
    const facturas = await getFacturasProveedores();
    return NextResponse.json(facturas);
  } catch (error) {
    console.error("Error in GET /api/v1/admin/facturas-proveedores:", error);
    return NextResponse.json(
      { message: "Error al cargar las facturas de proveedores", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
