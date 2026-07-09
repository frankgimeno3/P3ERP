import { NextResponse } from "next/server";
import { updateGestion } from "../../../../../../server/features/gestionProduccion/GestionProduccionRepository.js";

export const runtime = "nodejs";

export async function PUT(request, { params }) {
  try {
    const { id_gestion_prod: id } = await params;
    const result = await updateGestion(id, await request.json());
    return result ? NextResponse.json(result) : NextResponse.json({ message: "Gestion no encontrada" }, { status: 404 });
  } catch (error) { return NextResponse.json({ message: error.message }, { status: 400 }); }
}
