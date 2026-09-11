import { NextResponse } from "next/server";
import { createEndpoint } from "../../../../../../server/createEndpoint.js";
import { deleteAgente, getAgenteByEmail, updateAgenteRoles } from "../../../../../../server/features/agente/AgenteRepository.js";
import { deleteCognitoUser } from "../../../../../../server/features/user/UserSerivce.js";

export const runtime = "nodejs";

export async function PUT(request, { params }) {
  try {
    const { id_agente: idAgente } = await params;
    const body = await request.json();

    if (!idAgente) {
      return NextResponse.json({ message: "id_agente es obligatorio" }, { status: 400 });
    }

    if (body?.is_empleado_account !== undefined && typeof body.is_empleado_account !== 'boolean') {
      return NextResponse.json({ message: "La cuenta de empleado debe ser true o false" }, { status: 400 });
    }
    const agente = await updateAgenteRoles(idAgente, {
      nombre_completo_agente: body?.nombre_completo_agente,
      email_agente: body?.email_agente,
      is_empleado_account: body?.is_empleado_account,
      rol_agente: body?.rol_agente,
      estado_agente: body?.estado_agente,
      accesos_personalizados: body?.accesos_personalizados,
      array_accesos_adicionales: body?.array_accesos_adicionales,
    });

    if (!agente) {
      return NextResponse.json({ message: "Agente no encontrado" }, { status: 404 });
    }

    return NextResponse.json(agente);
  } catch (error) {
    console.error("Error in PUT /api/v1/admin/agentes/[id_agente]:", error);
    return NextResponse.json(
      { message: error.status ? error.message : "Error al actualizar el agente", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: error.status || 500 },
    );
  }
}

export const DELETE = createEndpoint(async (request, _body, { params }) => {
  const currentAgent = await getAgenteByEmail(request.email);
  const currentRole = String(currentAgent?.rol_agente || "").trim().toLowerCase();
  if (!["admin", "superadmin", "operaciones"].includes(currentRole)) {
    return NextResponse.json({ message: "No tienes permisos para borrar usuarios" }, { status: 403 });
  }

  const { id_agente: idAgente } = await params;
  try {
    const deleted = await deleteAgente(idAgente, async (agente) => {
      if (agente.email_agente) await deleteCognitoUser(agente.email_agente);
    });
    if (!deleted) return NextResponse.json({ message: "Agente no encontrado" }, { status: 404 });
    return NextResponse.json({
      deleted: true,
      id_agente: deleted.id_agente,
      deleted_tasks: deleted.deleted_tasks,
      deleted_task_lists: deleted.deleted_task_lists,
    });
  } catch (error) {
    if (error?.code === "EMPLOYEE_HISTORY") {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    if (error?.name === "AccessDeniedException") {
      return NextResponse.json({ message: "AWS no permite eliminar el usuario de Cognito. Falta el permiso cognito-idp:AdminDeleteUser; no se ha borrado el agente." }, { status: 503 });
    }
    throw error;
  }
}, null, true);
