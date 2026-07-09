import { NextResponse } from "next/server";
import { createPresign } from "../../../../../../server/features/mediateca/MediatecaRepository.js";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    return NextResponse.json(await createPresign(body));
  } catch (error) {
    return NextResponse.json({ message: error.message || "Error al crear URL de subida" }, { status: 400 });
  }
}
