import { requestActor } from "../../../../../server/features/comentario/AccountActivity.js";
import { NextResponse } from "next/server";
import { createPropuesta, getPropuestas, getProposalSendDates } from "../../../../../server/features/propuesta/PropuestaRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const idCuenta = params.get("id_cuenta")?.trim() || "";
    if (params.get("sendDatesOnly") === "true") {
      if (!idCuenta) return NextResponse.json({ message: "Indica la cuenta." }, { status: 400 });
      return NextResponse.json(await getProposalSendDates(idCuenta));
    }
    const propuestas = await getPropuestas({
      idCuenta,
      estado: params.get("estado")?.trim() || "",
      agente: params.get("agente")?.trim() || "",
      cliente: params.get("cliente")?.trim() || "",
      codigoCrm: params.get("codigo_crm")?.trim() || "",
    });

    return NextResponse.json(propuestas);
  } catch (error) {
    console.error("Error in GET /api/v1/comercial/propuestas:", error);
    return NextResponse.json(
      { message: "Error al cargar las propuestas", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const propuesta = await createPropuesta(body ?? {}, requestActor(request));
    return NextResponse.json(propuesta, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/comercial/propuestas:", error);
    return NextResponse.json(
      { message: "Error al crear la propuesta", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
