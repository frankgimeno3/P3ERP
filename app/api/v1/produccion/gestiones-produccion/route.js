import { NextResponse } from "next/server";
import { createGestion, getGestionesData } from "../../../../../server/features/gestionProduccion/GestionProduccionRepository.js";

export const runtime = "nodejs";

export async function GET() {
  try { return NextResponse.json(await getGestionesData()); }
  catch (error) { return NextResponse.json({ message: error.message }, { status: 500 }); }
}

export async function POST(request) {
  try { return NextResponse.json(await createGestion(await request.json()), { status: 201 }); }
  catch (error) { return NextResponse.json({ message: error.message }, { status: 400 }); }
}
