import { NextResponse } from "next/server";
import { createFacturaProveedor, getFacturasProveedores } from "../../../../../server/features/factura/FacturaRepository.js";

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

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body?.id_factura_proveedor && !body?.orden_compra_p3) {
      return NextResponse.json({ message: "id_factura_proveedor u orden_compra_p3 es obligatorio" }, { status: 400 });
    }

    const factura = await createFacturaProveedor(body);
    return NextResponse.json(factura, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/admin/facturas-proveedores:", error);
    return NextResponse.json(
      { message: "Error al crear la factura de proveedor", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
