import { NextResponse } from "next/server";
import { getOrdenesAdministrativas } from "../../../../../../server/features/orden/OrdenRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
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
