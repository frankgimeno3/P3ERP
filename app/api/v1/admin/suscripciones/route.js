import { NextResponse } from "next/server";
import { createSuscripcion, getSuscripciones } from "../../../../../server/features/suscripcion/SuscripcionRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const suscripciones = await getSuscripciones({
      estado: params.get("estado")?.trim() || "",
      id_cuenta: params.get("id_cuenta")?.trim() || "",
    });

    return NextResponse.json(suscripciones);
  } catch (error) {
    console.error("Error in GET /api/v1/admin/suscripciones:", error);
    return NextResponse.json(
      { message: "Error al cargar las suscripciones", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body?.id_cuenta) return NextResponse.json({ message: "Selecciona una cuenta" }, { status: 400 });
    const suscripcion = await createSuscripcion(body);
    return NextResponse.json(suscripcion, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/admin/suscripciones:", error);
    return NextResponse.json(
      { message: "Error al crear la suscripcion", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
