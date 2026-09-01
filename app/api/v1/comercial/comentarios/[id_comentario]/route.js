import { NextResponse } from "next/server";
import { deleteComentario, updateComentario } from "../../../../../../server/features/comentario/ComentarioRepository.js";

export const runtime = "nodejs";

async function getId(context) {
  const params = await context.params;
  return params?.id_comentario;
}

export async function PUT(request, context) {
  try {
    const idComentario = await getId(context);
    const body = await request.json();
    const comentario = await updateComentario(idComentario, body);
    if (!comentario) return NextResponse.json({ message: "Comentario no encontrado" }, { status: 404 });
    return NextResponse.json(comentario);
  } catch (error) {
    console.error("Error in PUT /api/v1/comercial/comentarios/[id_comentario]:", error);
    return NextResponse.json({ message: "Error al actualizar comentario", detail: process.env.NODE_ENV === "development" ? error.message : undefined }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const idComentario = await getId(context);
    const params = new URL(request.url).searchParams;
    const comentario = await deleteComentario(idComentario, { id_agente: params.get("id_agente") || "" });
    if (!comentario) return NextResponse.json({ message: "Comentario no encontrado" }, { status: 404 });
    return NextResponse.json(comentario);
  } catch (error) {
    console.error("Error in DELETE /api/v1/comercial/comentarios/[id_comentario]:", error);
    return NextResponse.json({ message: "Error al eliminar comentario", detail: process.env.NODE_ENV === "development" ? error.message : undefined }, { status: 500 });
  }
}
