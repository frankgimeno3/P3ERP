import { NextResponse } from "next/server";
import { getLineaBancoById, updateLineaBanco } from "../../../../../../server/features/banco/BancoRepository.js";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  try {
    const { id_linea_banco: idLineaBanco } = await params;
    const linea = await getLineaBancoById(idLineaBanco);
    return linea ? NextResponse.json(linea) : NextResponse.json({ message: "Linea de banco no encontrada" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ message: "Error al cargar la linea de banco", detail: process.env.NODE_ENV === "development" ? error.message : undefined }, { status: 500 });
  }
}

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
      id_proveedor: body?.id_proveedor,
      id_cuenta: body?.id_cuenta,
      id_agente: body?.id_agente,
      id_orden: body?.id_orden,
      id_pago: body?.id_pago,
      id_cargo_recurrente: body?.id_cargo_recurrente,
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
