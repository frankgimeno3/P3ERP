import { NextResponse } from "next/server";
import {
  createHojaProduccionContenido,
  getHojaProduccionContenidos,
} from "../../../../../server/features/contenido/ContenidoRepository.js";

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

export async function POST(request) {
  try {
    const body = await request.json();
    const contenido = await createHojaProduccionContenido(body);

    return NextResponse.json(contenido, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/produccion/hoja-produccion:", error);
    return NextResponse.json(
      { message: "Error al crear el contenido", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
