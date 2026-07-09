import { NextResponse } from "next/server";
import { getTarifas } from "../../../../../server/features/tarifa/TarifaRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const tarifas = await getTarifas({
      estado: params.get("estado")?.trim() || "",
    });
    return NextResponse.json(tarifas);
  } catch (error) {
    console.error("Error in GET /api/v1/produccion/tarifas:", error);
    return NextResponse.json(
      { message: "Error al cargar las tarifas", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
