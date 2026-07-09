import { NextResponse } from "next/server";
import { deleteFacturaProveedor, getFacturaProveedorById, updateFacturaProveedor } from "../../../../../../server/features/factura/FacturaRepository.js";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const { id_factura_proveedor: idFactura } = await params;
    const factura = await getFacturaProveedorById(idFactura);
    if (!factura) return NextResponse.json({ message: "Factura no encontrada" }, { status: 404 });
    return NextResponse.json(factura);
  } catch (error) {
    console.error("Error in GET /api/v1/admin/facturas-proveedores/[id_factura_proveedor]:", error);
    return NextResponse.json(
      { message: "Error al cargar la factura de proveedor", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id_factura_proveedor: idFactura } = await params;
    const body = await request.json();
    const factura = await updateFacturaProveedor(idFactura, body);

    if (!factura) {
      return NextResponse.json({ message: "Factura no encontrada" }, { status: 404 });
    }

    return NextResponse.json(factura);
  } catch (error) {
    console.error("Error in PUT /api/v1/admin/facturas-proveedores/[id_factura_proveedor]:", error);
    return NextResponse.json(
      { message: "Error al actualizar la factura de proveedor", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id_factura_proveedor: idFactura } = await params;
    const deleted = await deleteFacturaProveedor(idFactura);

    if (!deleted) {
      return NextResponse.json({ message: "Factura no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in DELETE /api/v1/admin/facturas-proveedores/[id_factura_proveedor]:", error);
    return NextResponse.json(
      { message: "Error al borrar la factura de proveedor", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
