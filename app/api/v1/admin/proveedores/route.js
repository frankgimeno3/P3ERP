import { NextResponse } from "next/server";
import { getProveedores } from "../../../../../server/features/proveedor/ProveedorRepository.js";
import { createSupplier, adminError } from '../../../../../server/features/proveedor/SupplierAdminRepository.js';

export const runtime = "nodejs";

export async function POST(request) {
  try { return NextResponse.json(await createSupplier(await request.json()), { status: 201 }); }
  catch (error) { return adminError(error); }
}

export async function GET() {
  try {
    const proveedores = await getProveedores();
    return NextResponse.json(proveedores);
  } catch (error) {
    console.error("Error in GET /api/v1/admin/proveedores:", error);
    return NextResponse.json(
      { message: "Error al cargar los proveedores", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
