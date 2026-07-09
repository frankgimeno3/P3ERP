import { NextResponse } from "next/server";
import {
  deleteContenidoProduccion,
  getContenidoProduccionById,
  updateContenidoProduccion,
} from "../../../../../../server/features/contenido/ContenidoRepository.js";

export const runtime = "nodejs";

async function getIdContenido(context) {
  const params = await context.params;
  return params?.id_contenido;
}

export async function GET(_request, context) {
  try {
    const idContenido = (await getIdContenido(context))?.trim();

    if (!idContenido) {
      return NextResponse.json({ message: "Falta el id del contenido" }, { status: 400 });
    }

    const contenido = await getContenidoProduccionById(idContenido);

    if (!contenido) {
      return NextResponse.json({ message: "Contenido no encontrado" }, { status: 404 });
    }

    return NextResponse.json(contenido);
  } catch (error) {
    console.error("Error in GET /api/v1/produccion/contenidos/[id_contenido]:", error);
    return NextResponse.json(
      { message: "Error al cargar el contenido", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function PATCH(request, context) {
  try {
    const idContenido = (await getIdContenido(context))?.trim();

    if (!idContenido) {
      return NextResponse.json({ message: "Falta el id del contenido" }, { status: 400 });
    }

    const body = await request.json();
    const contenido = await updateContenidoProduccion(idContenido, body);

    if (!contenido) {
      return NextResponse.json({ message: "Contenido no encontrado" }, { status: 404 });
    }

    return NextResponse.json(contenido);
  } catch (error) {
    console.error("Error in PATCH /api/v1/produccion/contenidos/[id_contenido]:", error);
    return NextResponse.json(
      { message: "Error al actualizar el contenido", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function DELETE(_request, context) {
  try {
    const idContenido = (await getIdContenido(context))?.trim();

    if (!idContenido) {
      return NextResponse.json({ message: "Falta el id del contenido" }, { status: 400 });
    }

    const deleted = await deleteContenidoProduccion(idContenido);

    if (!deleted) {
      return NextResponse.json({ message: "Contenido no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in DELETE /api/v1/produccion/contenidos/[id_contenido]:", error);
    return NextResponse.json(
      { message: "Error al eliminar el contenido", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
