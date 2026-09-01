import { NextResponse } from "next/server";
import { getCuentaEventos } from "../../../../../../../server/features/registroEventos/RegistroEventosRepository.js";

export const runtime = "nodejs";

export async function GET(_request, context) {
  try {
    const params = await context.params;
    const idCuenta = params?.id_cuenta;
    if (!idCuenta) {
      return NextResponse.json({ message: "id_cuenta es obligatorio" }, { status: 400 });
    }
    return NextResponse.json(await getCuentaEventos(idCuenta));
  } catch (error) {
    console.error("Error in GET /api/v1/comercial/cuentas/[id_cuenta]/registro-eventos:", error);
    return NextResponse.json(
      { message: "Error al cargar el registro de eventos", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
