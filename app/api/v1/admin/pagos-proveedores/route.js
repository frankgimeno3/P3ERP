import { NextResponse } from "next/server";
import { getPagosProveedores } from "../../../../../server/features/proveedor/ProveedorRepository.js";

export const runtime = "nodejs";

export async function GET() {
  try {
    const pagos = await getPagosProveedores();
    return NextResponse.json(pagos);
  } catch (error) {
    console.error("Error in GET /api/v1/admin/pagos-proveedores:", error);
    return NextResponse.json(
      { message: "Error al cargar los pagos de proveedores", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
