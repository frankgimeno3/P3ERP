import { NextResponse } from "next/server";
import { updateAgenteRoles } from "../../../../../../server/features/agente/AgenteRepository.js";

export const runtime = "nodejs";

export async function PUT(request, { params }) {
  try {
    const { id_agente: idAgente } = await params;
    const body = await request.json();

    if (!idAgente) {
      return NextResponse.json({ message: "id_agente es obligatorio" }, { status: 400 });
    }

    const agente = await updateAgenteRoles(idAgente, {
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
      { message: "Error al actualizar el agente", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
