import { NextResponse } from "next/server";
import { getTarifaById } from "../../../../../../server/features/tarifa/TarifaRepository.js";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const { id_tarifa: idTarifa } = await params;
    const tarifa = await getTarifaById(idTarifa);
    if (!tarifa) return NextResponse.json({ message: "Tarifa no encontrada" }, { status: 404 });
    return NextResponse.json(tarifa);
  } catch (error) {
    console.error("Error in GET /api/v1/produccion/tarifas/[id_tarifa]:", error);
    return NextResponse.json(
      { message: "Error al cargar la tarifa", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
