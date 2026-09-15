import { requestActor } from "../../../../../../server/features/comentario/AccountActivity.js";
import { NextResponse } from "next/server";
import {
  deletePropuesta,
  getPropuestaById,
  updatePropuesta,
} from "../../../../../../server/features/propuesta/PropuestaRepository.js";

export const runtime = "nodejs";

async function getId(params) {
  const resolved = await params;
  return resolved?.id_propuesta;
}

export async function GET(_request, { params }) {
  try {
    const idPropuesta = await getId(params);
    const propuesta = await getPropuestaById(idPropuesta);
    if (!propuesta) return NextResponse.json({ message: "Propuesta no encontrada" }, { status: 404 });
    return NextResponse.json(propuesta);
  } catch (error) {
    console.error("Error in GET /api/v1/comercial/propuestas/[id_propuesta]:", error);
    return NextResponse.json(
      { message: "Error al cargar la propuesta", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const idPropuesta = await getId(params);
    const body = await request.json();
    const propuesta = await updatePropuesta(idPropuesta, body ?? {}, requestActor(request));
    if (!propuesta) return NextResponse.json({ message: "Propuesta no encontrada" }, { status: 404 });
    return NextResponse.json(propuesta);
  } catch (error) {
    console.error("Error in PUT /api/v1/comercial/propuestas/[id_propuesta]:", error);
    return NextResponse.json(
      { message: "Error al actualizar la propuesta", detail: error.message || "Error interno al procesar la propuesta" },
      { status: 500 },
    );
  }
}

export async function PATCH(request, { params }) {
  return PUT(request, { params });
}

export async function DELETE(_request, { params }) {
  try {
    const idPropuesta = await getId(params);
    const propuesta = await deletePropuesta(idPropuesta, requestActor(_request));
    if (!propuesta) return NextResponse.json({ message: "Propuesta no encontrada" }, { status: 404 });
    return NextResponse.json(propuesta);
  } catch (error) {
    console.error("Error in DELETE /api/v1/comercial/propuestas/[id_propuesta]:", error);
    return NextResponse.json(
      { message: "Error al borrar la propuesta", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
