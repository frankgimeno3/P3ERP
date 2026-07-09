import { NextResponse } from "next/server";
import { createTareasLista, ensureTaskListsForAgents, getTareasListas } from "../../../../../server/features/tarea/TareaRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const agente = params.get("agente")?.trim() || "";

    if (!agente) {
      return NextResponse.json({ message: "agente es obligatorio" }, { status: 400 });
    }

    await ensureTaskListsForAgents();
    const listas = await getTareasListas(agente);
    return NextResponse.json(listas);
  } catch (error) {
    console.error("Error in GET /api/v1/direccion/tareas-listas:", error);
    return NextResponse.json(
      { message: "Error al cargar las listas de tareas", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body?.id_agente || !body?.nombre_lista_tareas) {
      return NextResponse.json({ message: "id_agente y nombre_lista_tareas son obligatorios" }, { status: 400 });
    }

    const lista = await createTareasLista(body);
    return NextResponse.json(lista, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/direccion/tareas-listas:", error);
    return NextResponse.json(
      { message: "Error al crear la lista de tareas", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
