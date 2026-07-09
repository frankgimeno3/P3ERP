import { NextResponse } from "next/server";
import { createRevista, getRevistas } from "../../../../../server/features/revista/RevistaRepository.js";

export const runtime = "nodejs";

export async function GET() {
  try {
    const revistas = await getRevistas();
    return NextResponse.json(revistas);
  } catch (error) {
    console.error("Error in GET /api/v1/produccion/revistas:", error);
    return NextResponse.json(
      { message: "Error al cargar las revistas", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const revista = await createRevista(body);
    return NextResponse.json(revista, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/produccion/revistas:", error);
    return NextResponse.json(
      { message: "Error al crear la revista", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
