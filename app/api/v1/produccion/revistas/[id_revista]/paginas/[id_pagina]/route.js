import { NextResponse } from "next/server";
import { updatePaginaPublicacion } from "../../../../../../../../server/features/revista/RevistaRepository.js";

export const runtime = "nodejs";

export async function PATCH(request, { params }) {
  try {
    const { id_revista: publicationId, id_pagina: pageId } = await params;
    const result = await updatePaginaPublicacion(publicationId, pageId, await request.json());
    return result ? NextResponse.json(result) : NextResponse.json({ message: "Pagina no encontrada" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
