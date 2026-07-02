import { NextResponse } from "next/server";
import { getGmAgentes, getGmCuentas, getNextGmCodigo, upsertGmCuenta } from "../../../../../server/features/gm/GmRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;

    if (params.get("next") === "1") {
      const [codigo, agentes] = await Promise.all([getNextGmCodigo(), getGmAgentes()]);
      return NextResponse.json({ codigo, agentes });
    }

    const cuentas = await getGmCuentas();
    return NextResponse.json(cuentas);
  } catch (error) {
    console.error("Error in GET /api/v1/gm/cuentas:", error);
    return NextResponse.json(
      { message: "Error al cargar cuentas GM", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body?.cuenta?.codigo) {
      return NextResponse.json({ message: "codigo es obligatorio" }, { status: 400 });
    }

    const result = await upsertGmCuenta(body.cuenta, body.contactos || []);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/gm/cuentas:", error);
    return NextResponse.json(
      { message: "Error al crear cuenta GM", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
