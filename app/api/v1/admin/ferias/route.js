import { NextResponse } from "next/server";
import { createFeria, getFerias } from "../../../../../server/features/feria/FeriaRepository.js";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ferias = await getFerias();
    return NextResponse.json(ferias);
  } catch (error) {
    console.error("Error in GET /api/v1/admin/ferias:", error);
    return NextResponse.json(
      { message: "Error al cargar las ferias", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body?.id_feria || !body?.titulo_especifico_edicion) {
      return NextResponse.json({ message: "id_feria y titulo_especifico_edicion son obligatorios" }, { status: 400 });
    }

    const feria = await createFeria(body);
    return NextResponse.json(feria, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/admin/ferias:", error);
    return NextResponse.json(
      { message: "Error al crear la feria", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
