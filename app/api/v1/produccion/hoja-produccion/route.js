import { NextResponse } from "next/server";
import { getHojaProduccionContenidos } from "../../../../../server/features/contenido/ContenidoRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const contenidos = await getHojaProduccionContenidos({
      year: params.get("year")?.trim() || "",
    });

    return NextResponse.json(contenidos);
  } catch (error) {
    console.error("Error in GET /api/v1/produccion/hoja-produccion:", error);
    return NextResponse.json(
      { message: "Error al cargar la hoja de producción", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
