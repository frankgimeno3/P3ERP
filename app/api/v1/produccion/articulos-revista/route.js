import { NextResponse } from "next/server";
import { getArticulos, saveArticulo } from "../../../../../server/features/gestionProduccion/GestionProduccionRepository.js";

export const runtime = "nodejs";
export async function GET() {
  try { return NextResponse.json(await getArticulos()); }
  catch (error) { return NextResponse.json({ message: error.message }, { status: 500 }); }
}
export async function POST(request) {
  try { return NextResponse.json(await saveArticulo("", await request.json()), { status: 201 }); }
  catch (error) { return NextResponse.json({ message: error.message }, { status: 400 }); }
}
