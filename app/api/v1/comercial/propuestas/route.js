import { NextResponse } from "next/server";
import { createPropuesta, getPropuestas } from "../../../../../server/features/propuesta/PropuestaRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const propuestas = await getPropuestas({
      idCuenta: params.get("id_cuenta")?.trim() || "",
      estado: params.get("estado")?.trim() || "",
      agente: params.get("agente")?.trim() || "",
      cliente: params.get("cliente")?.trim() || "",
      codigoCrm: params.get("codigo_crm")?.trim() || "",
    });

    return NextResponse.json(propuestas);
  } catch (error) {
    console.error("Error in GET /api/v1/comercial/propuestas:", error);
    return NextResponse.json(
      { message: "Error al cargar las propuestas", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const propuesta = await createPropuesta(body ?? {});
    return NextResponse.json(propuesta, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/comercial/propuestas:", error);
    return NextResponse.json(
      { message: "Error al crear la propuesta", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
