import { NextResponse } from "next/server";
import { createPublicationOption } from "../../../../../../server/features/servicio/ServicioRepository.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    return NextResponse.json(await createPublicationOption(await request.json()), { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Error al crear la publicación", detail: error.message }, { status: 400 });
  }
}
