import { NextResponse } from "next/server";
import { createLista } from "../../../../../server/features/gestionProduccion/GestionProduccionRepository.js";

export const runtime = "nodejs";

export async function POST(request) {
  try { return NextResponse.json(await createLista(await request.json()), { status: 201 }); }
  catch (error) { return NextResponse.json({ message: error.message }, { status: 400 }); }
}
