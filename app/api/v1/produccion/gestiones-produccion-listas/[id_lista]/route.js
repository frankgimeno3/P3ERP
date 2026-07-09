import { NextResponse } from "next/server";
import { deleteLista, updateLista } from "../../../../../../server/features/gestionProduccion/GestionProduccionRepository.js";

export const runtime = "nodejs";

export async function PUT(request, { params }) {
  try {
    const { id_lista: id } = await params;
    return NextResponse.json(await updateLista(id, await request.json()));
  } catch (error) { return NextResponse.json({ message: error.message }, { status: 400 }); }
}

export async function DELETE(request, { params }) {
  try {
    const { id_lista: id } = await params;
    const moveTo = new URL(request.url).searchParams.get("moveTo") || "";
    return NextResponse.json(await deleteLista(id, moveTo));
  } catch (error) { return NextResponse.json({ message: error.message }, { status: 400 }); }
}
