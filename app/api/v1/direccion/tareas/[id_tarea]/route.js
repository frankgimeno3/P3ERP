import { NextResponse } from "next/server";
import { deleteTarea, updateTarea } from "../../../../../../server/features/tarea/TareaRepository.js";

export const runtime = "nodejs";

function invalidDateRange(body) {
  const hasDesde = Boolean(body?.fecha_desde);
  const hasHasta = Boolean(body?.fecha_hasta);
  return hasDesde !== hasHasta || (hasDesde && body.fecha_hasta < body.fecha_desde);
}

export async function PUT(request, { params }) {
  try {
    const { id_tarea: idTarea } = await params;
    const body = await request.json();

    if (!idTarea) {
      return NextResponse.json({ message: "id_tarea es obligatorio" }, { status: 400 });
    }
    if (invalidDateRange(body)) {
      return NextResponse.json({ message: "Indica ambas fechas, ninguna, y asegúrate de que fecha_hasta no sea anterior a fecha_desde" }, { status: 400 });
    }

    const tarea = await updateTarea(idTarea, body);
    if (!tarea) {
      return NextResponse.json({ message: "Tarea no encontrada" }, { status: 404 });
    }

    return NextResponse.json(tarea);
  } catch (error) {
    console.error("Error in PUT /api/v1/direccion/tareas/[id_tarea]:", error);
    return NextResponse.json(
      { message: "Error al actualizar la tarea", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const { id_tarea: idTarea } = await params;

    if (!idTarea) {
      return NextResponse.json({ message: "id_tarea es obligatorio" }, { status: 400 });
    }

    const tarea = await deleteTarea(idTarea);
    if (!tarea) {
      return NextResponse.json({ message: "Tarea no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, tarea });
  } catch (error) {
    console.error("Error in DELETE /api/v1/direccion/tareas/[id_tarea]:", error);
    return NextResponse.json(
      { message: "Error al eliminar la tarea", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
