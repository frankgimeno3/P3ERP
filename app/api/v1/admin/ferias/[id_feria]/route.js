import { NextResponse } from "next/server";
import { getFeriaById } from "../../../../../../server/features/feria/FeriaRepository.js";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const { id_feria: idFeria } = await params;
    const feria = await getFeriaById(idFeria);

    if (!feria) {
      return NextResponse.json({ message: "Feria no encontrada" }, { status: 404 });
    }

    return NextResponse.json(feria);
  } catch (error) {
    console.error("Error in GET /api/v1/admin/ferias/[id_feria]:", error);
    return NextResponse.json(
      { message: "Error al cargar la feria", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
