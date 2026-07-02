import { NextResponse } from "next/server";
import { getContratos } from "../../../../../server/features/contrato/ContratoRepository.js";

export const runtime = "nodejs";

export async function GET() {
  try {
    const contratos = await getContratos();
    return NextResponse.json(contratos);
  } catch (error) {
    console.error("Error in GET /api/v1/comercial/contratos:", error);
    return NextResponse.json(
      { message: "Error al cargar los contratos", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
