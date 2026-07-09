import { NextResponse } from "next/server";
import { createLineasBanco, getLineasBanco } from "../../../../../server/features/banco/BancoRepository.js";

export const runtime = "nodejs";

export async function GET() {
  try {
    const lineas = await getLineasBanco();
    return NextResponse.json(lineas);
  } catch (error) {
    console.error("Error in GET /api/v1/direccion/bancos:", error);
    return NextResponse.json(
      { message: "Error al cargar las lineas de banco", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const lineas = Array.isArray(body?.lineas) ? body.lineas : [];

    if (!lineas.length) {
      return NextResponse.json({ message: "No hay lineas para importar" }, { status: 400 });
    }

    const created = await createLineasBanco(lineas);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/direccion/bancos:", error);
    return NextResponse.json(
      { message: "Error al importar las lineas de banco", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
