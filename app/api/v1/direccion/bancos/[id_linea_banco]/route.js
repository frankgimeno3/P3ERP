import { NextResponse } from "next/server";
import { updateLineaBanco } from "../../../../../../server/features/banco/BancoRepository.js";

export const runtime = "nodejs";

export async function PUT(request, { params }) {
  try {
    const { id_linea_banco: idLineaBanco } = await params;
    const body = await request.json();

    if (!idLineaBanco) {
      return NextResponse.json({ message: "id_linea_banco es obligatorio" }, { status: 400 });
    }

    const linea = await updateLineaBanco(idLineaBanco, {
      estado_revision: body?.estado_revision,
      comentarios: body?.comentarios,
    });

    if (!linea) {
      return NextResponse.json({ message: "Linea de banco no encontrada" }, { status: 404 });
    }

    return NextResponse.json(linea);
  } catch (error) {
    console.error("Error in PUT /api/v1/direccion/bancos/[id_linea_banco]:", error);
    return NextResponse.json(
      { message: "Error al actualizar la linea de banco", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
