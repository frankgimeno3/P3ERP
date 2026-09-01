import { NextResponse } from "next/server";
import { createComentario, getComentarios } from "../../../../../server/features/comentario/ComentarioRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const tipoEntidad = params.get("tipo_entidad") || "";
    const idEntidad = params.get("id_entidad") || "";
    if (!tipoEntidad || !idEntidad) {
      return NextResponse.json({ message: "tipo_entidad e id_entidad son obligatorios" }, { status: 400 });
    }
    return NextResponse.json(await getComentarios({ tipoEntidad, idEntidad }));
  } catch (error) {
    console.error("Error in GET /api/v1/comercial/comentarios:", error);
    return NextResponse.json({ message: "Error al cargar comentarios", detail: process.env.NODE_ENV === "development" ? error.message : undefined }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    return NextResponse.json(await createComentario(body), { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/comercial/comentarios:", error);
    return NextResponse.json({ message: "Error al crear comentario", detail: process.env.NODE_ENV === "development" ? error.message : undefined }, { status: 500 });
  }
}
