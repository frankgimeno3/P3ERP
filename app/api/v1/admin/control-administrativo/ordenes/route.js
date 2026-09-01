import { NextResponse } from "next/server";
import { getOrdenAdministrativaById, getOrdenesAdministrativas } from "../../../../../../server/features/orden/OrdenRepository.js";
import { updateAdministrativeOrder } from "../../../../../../server/features/factura/FacturaClienteRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (id) {
      const orden = await getOrdenAdministrativaById(id);
      return orden ? NextResponse.json(orden) : NextResponse.json({ message: "Orden no encontrada" }, { status: 404 });
    }
    const ordenes = await getOrdenesAdministrativas({
      search: searchParams.get("search") || "",
    });

    return NextResponse.json(ordenes);
  } catch (error) {
    console.error("Error in GET /api/v1/admin/control-administrativo/ordenes:", error);
    return NextResponse.json(
      { message: "Error al cargar las órdenes", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function PUT(request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ message: "Falta el identificador" }, { status: 400 });
    const row = await updateAdministrativeOrder(id, await request.json());
    return row ? NextResponse.json(row) : NextResponse.json({ message: "Orden no encontrada" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ message: "Error al guardar la orden", detail: error.message }, { status: 400 });
  }
}
