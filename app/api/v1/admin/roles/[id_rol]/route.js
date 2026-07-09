import { NextResponse } from "next/server";
import { getRoleById, updateRolePermissions } from "../../../../../../server/features/role/RoleRepository.js";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const { id_rol: idRol } = await params;
    const role = await getRoleById(idRol);

    if (!role) {
      return NextResponse.json({ message: "Rol no encontrado" }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error("Error in GET /api/v1/admin/roles/[id_rol]:", error);
    return NextResponse.json(
      { message: "Error al cargar el rol", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id_rol: idRol } = await params;
    const body = await request.json();
    const role = await updateRolePermissions(idRol, body?.permisos_rol, body?.array_accesos_adicionales);

    if (!role) {
      return NextResponse.json({ message: "Rol no encontrado" }, { status: 404 });
    }

    return NextResponse.json(role);
  } catch (error) {
    console.error("Error in PUT /api/v1/admin/roles/[id_rol]:", error);
    return NextResponse.json(
      { message: "Error al actualizar el rol", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
