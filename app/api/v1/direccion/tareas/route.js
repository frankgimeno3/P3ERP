import { NextResponse } from "next/server";
import { createTarea, ensureTaskListsForAgents, getTareas } from "../../../../../server/features/tarea/TareaRepository.js";

export const runtime = "nodejs";

function invalidDateRange(body) {
  const hasDesde = Boolean(body?.fecha_desde);
  const hasHasta = Boolean(body?.fecha_hasta);
  return hasDesde !== hasHasta || (hasDesde && body.fecha_hasta < body.fecha_desde);
}

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    await ensureTaskListsForAgents();
    const tareas = await getTareas({ agente: params.get("agente")?.trim() || "" });
    return NextResponse.json(tareas);
  } catch (error) {
    console.error("Error in GET /api/v1/direccion/tareas:", error);
    return NextResponse.json(
      { message: "Error al cargar las tareas", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body?.agente || !body?.titulo) {
      return NextResponse.json({ message: "agente y titulo son obligatorios" }, { status: 400 });
    }
    if (invalidDateRange(body)) {
      return NextResponse.json({ message: "Indica ambas fechas, ninguna, y asegúrate de que fecha_hasta no sea anterior a fecha_desde" }, { status: 400 });
    }

    const tarea = await createTarea(body);
    return NextResponse.json(tarea, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/direccion/tareas:", error);
    return NextResponse.json(
      { message: "Error al crear la tarea", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
