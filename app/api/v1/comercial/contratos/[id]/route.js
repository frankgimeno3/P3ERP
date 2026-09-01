import { NextResponse } from "next/server";
import { getContratoById, updateContrato } from "../../../../../../server/features/contrato/ContratoRepository.js";

export const runtime = "nodejs";

async function getId(context) {
  const params = await context.params;
  return params?.id;
}

export async function GET(_request, context) {
  try {
    const id = await getId(context);

    if (!id) {
      return NextResponse.json({ message: "id es obligatorio" }, { status: 400 });
    }

    const contrato = await getContratoById(id);

    if (!contrato) {
      return NextResponse.json({ message: "Contrato no encontrado" }, { status: 404 });
    }

    return NextResponse.json(contrato);
  } catch (error) {
    console.error("Error in GET /api/v1/comercial/contratos/[id]:", error);
    return NextResponse.json(
      { message: "Error al cargar el contrato", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function PATCH(request, context) {
  try {
    const id = await getId(context);
    if (!id) {
      return NextResponse.json({ message: "id es obligatorio" }, { status: 400 });
    }
    const contrato = await updateContrato(id, await request.json());
    if (!contrato) {
      return NextResponse.json({ message: "Contrato no encontrado" }, { status: 404 });
    }
    return NextResponse.json(contrato);
  } catch (error) {
    console.error("Error in PATCH /api/v1/comercial/contratos/[id]:", error);
    return NextResponse.json(
      { message: "Error al actualizar el contrato", detail: error.message },
      { status: 500 },
    );
  }
}

export const PUT = PATCH;
