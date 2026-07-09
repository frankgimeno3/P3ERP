import { NextResponse } from "next/server";
import { deleteTareasLista, updateTareasLista } from "../../../../../../server/features/tarea/TareaRepository.js";

export const runtime = "nodejs";

export async function PUT(request, { params }) {
  try {
    const { id_lista_tareas: idLista } = await params;
    const body = await request.json();

    if (!idLista) {
      return NextResponse.json({ message: "id_lista_tareas es obligatorio" }, { status: 400 });
    }

    const lista = await updateTareasLista(idLista, body);
    if (!lista) {
      return NextResponse.json({ message: "Lista no encontrada" }, { status: 404 });
    }

    return NextResponse.json(lista);
  } catch (error) {
    console.error("Error in PUT /api/v1/direccion/tareas-listas/[id_lista_tareas]:", error);
    return NextResponse.json(
      { message: "Error al actualizar la lista", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id_lista_tareas: idLista } = await params;
    const searchParams = new URL(request.url).searchParams;
    const moveToList = searchParams.get("moveToList")?.trim() || "";

    if (!idLista) {
      return NextResponse.json({ message: "id_lista_tareas es obligatorio" }, { status: 400 });
    }

    const lista = await deleteTareasLista(idLista, moveToList);
    if (!lista) {
      return NextResponse.json({ message: "Lista no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, lista });
  } catch (error) {
    console.error("Error in DELETE /api/v1/direccion/tareas-listas/[id_lista_tareas]:", error);
    return NextResponse.json(
      { message: error.code === "LIST_HAS_TASKS" ? error.message : "Error al eliminar la lista", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: error.code === "LIST_HAS_TASKS" ? 400 : 500 },
    );
  }
}
