import { NextResponse } from "next/server";
import { getAgentes } from "../../../../../server/features/agente/AgenteRepository.js";

export const runtime = "nodejs";

export async function GET() {
  try {
    const agentes = await getAgentes();
    return NextResponse.json(agentes);
  } catch (error) {
    console.error("Error in GET /api/v1/admin/agentes:", error);
    return NextResponse.json(
      { message: "Error al cargar los agentes", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
