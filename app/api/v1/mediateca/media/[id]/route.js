import { NextResponse } from "next/server";
import { deleteMedia, getMediaById, updateMedia } from "../../../../../../server/features/mediateca/MediatecaRepository.js";

export const runtime = "nodejs";

async function getId(params) {
  const resolved = await params;
  return resolved?.id;
}

export async function GET(_request, { params }) {
  try {
    const id = await getId(params);
    const media = await getMediaById(id);
    if (!media) return NextResponse.json({ message: "Archivo no encontrado" }, { status: 404 });
    return NextResponse.json(media);
  } catch (error) {
    return NextResponse.json({ message: "Error al cargar archivo", detail: process.env.NODE_ENV === "development" ? error.message : undefined }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const id = await getId(params);
    const body = await request.json();
    return NextResponse.json(await updateMedia(id, body));
  } catch (error) {
    return NextResponse.json({ message: error.message || "Error al actualizar archivo" }, { status: 400 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const id = await getId(params);
    return NextResponse.json(await deleteMedia(id));
  } catch (error) {
    return NextResponse.json({ message: error.message || "Error al borrar archivo" }, { status: 400 });
  }
}
