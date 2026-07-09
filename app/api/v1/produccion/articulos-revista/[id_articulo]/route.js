import { NextResponse } from "next/server";
import { getArticulo, saveArticulo } from "../../../../../../server/features/gestionProduccion/GestionProduccionRepository.js";

export const runtime = "nodejs";
export async function GET(_request, { params }) {
  const { id_articulo: id } = await params;
  const item = await getArticulo(id);
  return item ? NextResponse.json(item) : NextResponse.json({ message: "Articulo no encontrado" }, { status: 404 });
}
export async function PUT(request, { params }) {
  const { id_articulo: id } = await params;
  return NextResponse.json(await saveArticulo(id, await request.json()));
}
