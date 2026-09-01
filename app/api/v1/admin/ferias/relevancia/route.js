import { NextResponse } from "next/server";
import { markFeriasRelevant } from "../../../../../../server/features/feria/FeriaRepository.js";

export const runtime = "nodejs";

export async function PATCH(request) {
  try {
    const body = await request.json();
    const ids = Array.isArray(body?.ids) ? body.ids : [];
    if (!ids.length) return NextResponse.json({ message: "Selecciona al menos una feria" }, { status: 400 });
    return NextResponse.json(await markFeriasRelevant(ids));
  } catch (error) {
    console.error("Error in PATCH /api/v1/admin/ferias/relevancia:", error);
    return NextResponse.json({ message: "No se pudieron marcar las ferias como relevantes", detail: error.message }, { status: 500 });
  }
}
