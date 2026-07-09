import { NextResponse } from "next/server";
import { getRevistaById, updateRevista } from "../../../../../../server/features/revista/RevistaRepository.js";

export const runtime = "nodejs";

async function getId(context) {
  const params = await context.params;
  return params?.id_revista;
}

export async function GET(_request, context) {
  try {
    const idRevista = (await getId(context))?.trim();
    const revista = idRevista ? await getRevistaById(idRevista) : null;
    if (!revista) return NextResponse.json({ message: "Revista no encontrada" }, { status: 404 });
    return NextResponse.json(revista);
  } catch (error) {
    console.error("Error in GET /api/v1/produccion/revistas/[id_revista]:", error);
    return NextResponse.json({ message: "Error al cargar la revista", detail: process.env.NODE_ENV === "development" ? error.message : undefined }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const idRevista = (await getId(context))?.trim();
    const body = await request.json();
    const revista = idRevista ? await updateRevista(idRevista, body) : null;
    if (!revista) return NextResponse.json({ message: "Revista no encontrada" }, { status: 404 });
    return NextResponse.json(revista);
  } catch (error) {
    console.error("Error in PATCH /api/v1/produccion/revistas/[id_revista]:", error);
    return NextResponse.json({ message: "Error al actualizar la revista", detail: process.env.NODE_ENV === "development" ? error.message : undefined }, { status: 500 });
  }
}
