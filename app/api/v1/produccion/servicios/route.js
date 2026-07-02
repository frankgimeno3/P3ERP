import { NextResponse } from "next/server";
import { getServicios } from "../../../../../server/features/servicio/ServicioRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const servicios = await getServicios({
      idMedio: params.get("id_medio")?.trim() || "",
      medio: params.get("medio")?.trim() || "",
      publicacion: params.get("publicacion")?.trim() || "",
      servicio: params.get("servicio")?.trim() || "",
    });

    return NextResponse.json(servicios);
  } catch (error) {
    console.error("Error in GET /api/v1/produccion/servicios:", error);
    return NextResponse.json(
      { message: "Error al cargar los servicios", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
