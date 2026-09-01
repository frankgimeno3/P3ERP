import { NextResponse } from "next/server";
import { getLineasBanco, reconcileLineasBanco } from "../../../../../server/features/banco/BancoRepository.js";

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
    const banco = String(body?.banco || "");

    if (!lineas.length || !["Sabadell", "Santander"].includes(banco)) {
      return NextResponse.json({ message: "No hay lineas para importar" }, { status: 400 });
    }

    const result = await reconcileLineasBanco(banco, lineas);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/direccion/bancos:", error);
    return NextResponse.json(
      { message: "Error al importar las lineas de banco", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
