import { NextResponse } from "next/server";
import { getRoles } from "../../../../../server/features/role/RoleRepository.js";

export const runtime = "nodejs";

export async function GET() {
  try {
    const roles = await getRoles();
    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error in GET /api/v1/admin/roles:", error);
    return NextResponse.json(
      { message: "Error al cargar los roles", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
