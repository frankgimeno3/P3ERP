import { NextResponse } from "next/server";
import { deleteFolder, updateFolder } from "../../../../../../server/features/mediateca/MediatecaRepository.js";

export const runtime = "nodejs";

async function getId(params) {
  const resolved = await params;
  return resolved?.id;
}

export async function PATCH(request, { params }) {
  try {
    const id = await getId(params);
    const body = await request.json();
    return NextResponse.json(await updateFolder(id, body));
  } catch (error) {
    return NextResponse.json({ message: error.message || "Error al actualizar carpeta" }, { status: 400 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = await getId(params);
    return NextResponse.json(await deleteFolder(id));
  } catch (error) {
    return NextResponse.json({ message: error.message || "Error al borrar carpeta" }, { status: 400 });
  }
}
