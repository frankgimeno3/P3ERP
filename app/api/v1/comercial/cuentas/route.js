import { NextResponse } from "next/server";
import { createCuenta, getCuentas } from "../../../../../server/features/cuenta/CuentaRepository.js";

export const runtime = "nodejs";

function getFilters(request) {
  const params = new URL(request.url).searchParams;

  return {
    clienteFiltro: params.get("clienteFiltro")?.trim() || "",
    codigoCrmFiltro: params.get("codigoCrmFiltro")?.trim() || "",
    agenteFiltro: params.get("agenteFiltro")?.trim() || "",
    telFiltro: params.get("telFiltro")?.trim() || "",
    paisFiltro: params.get("paisFiltro")?.trim() || "",
  };
}

export async function GET(request) {
  try {
    const cuentas = await getCuentas(getFilters(request));
    return NextResponse.json(cuentas);
  } catch (error) {
    console.error("Error in GET /api/v1/comercial/cuentas:", error);
    return NextResponse.json(
      { message: "Error al cargar las cuentas", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body?.id_cuenta) {
      return NextResponse.json({ message: "id_cuenta es obligatorio" }, { status: 400 });
    }

    const cuenta = await createCuenta(body);
    return NextResponse.json(cuenta, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/comercial/cuentas:", error);
    return NextResponse.json(
      { message: "Error al crear la cuenta", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
