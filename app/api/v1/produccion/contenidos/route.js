import { NextResponse } from "next/server";
import {
  createContenidoProduccion,
  getContenidosProduccion,
} from "../../../../../server/features/contenido/ContenidoRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const contenidos = await getContenidosProduccion({
      estado: params.get("estado")?.trim() || "",
      destino: params.get("destino")?.trim() || "",
      medio: params.get("medio")?.trim() || "",
      id_cuenta: params.get("id_cuenta")?.trim() || "",
      tipo_valor: params.get("tipo_valor")?.trim() || "",
    });

    return NextResponse.json(contenidos);
  } catch (error) {
    console.error("Error in GET /api/v1/produccion/contenidos:", error);
    return NextResponse.json(
      { message: "Error al cargar los contenidos", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body?.destino_revista && !body?.destino_vidrioperfil) {
      return NextResponse.json({ message: "Selecciona revista, vidrioperfil o ambos" }, { status: 400 });
    }

    if (body?.destino_vidrioperfil && !body?.fecha_maxima_publicacion_vidrioperfil) {
      return NextResponse.json({ message: "La fecha maxima de publicacion es obligatoria para Vidrioperfil" }, { status: 400 });
    }

    const contenido = await createContenidoProduccion(body);
    return NextResponse.json(contenido, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/produccion/contenidos:", error);
    return NextResponse.json(
      { message: "Error al crear el contenido", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
