import { NextResponse } from "next/server";
import { getServicioById } from "../../../../../../server/features/servicio/ServicioRepository.js";

export const runtime = "nodejs";

async function getIdServicio(context) {
  const params = await context.params;
  return params?.id_servicio;
}

export async function GET(_request, context) {
  try {
    const idServicio = await getIdServicio(context);

    if (!idServicio) {
      return NextResponse.json({ message: "id_servicio es obligatorio" }, { status: 400 });
    }

    const servicio = await getServicioById(idServicio);

    if (!servicio) {
      return NextResponse.json({ message: "Servicio no encontrado" }, { status: 404 });
    }

    return NextResponse.json(servicio);
  } catch (error) {
    console.error("Error in GET /api/v1/produccion/servicios/[id_servicio]:", error);
    return NextResponse.json(
      { message: "Error al cargar el servicio", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
