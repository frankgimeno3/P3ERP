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

    if (!body?.id_feria_base || !body?.titulo_especifico_edicion) {
      return NextResponse.json({ message: "Feria del catálogo y título de la edición son obligatorios" }, { status: 400 });
    }

    const feria = await createFeria(body);
    return NextResponse.json(feria, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/admin/ferias:", error);
    return NextResponse.json(
      { message: error.status === 400 ? error.message : "Error al crear la edición", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: error.status || 500 },
    );
  }
}
