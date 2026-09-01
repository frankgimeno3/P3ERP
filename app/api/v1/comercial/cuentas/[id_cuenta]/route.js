import { NextResponse } from "next/server";
import { deleteCuenta, getCuentaById, updateCuenta } from "../../../../../../server/features/cuenta/CuentaRepository.js";

export const runtime = "nodejs";

async function getIdCuenta(context) {
  const params = await context.params;
  return params?.id_cuenta;
}

export async function GET(_request, context) {
  try {
    const idCuenta = await getIdCuenta(context);

    if (!idCuenta) {
      return NextResponse.json({ message: "id_cuenta es obligatorio" }, { status: 400 });
    }

    const cuenta = await getCuentaById(idCuenta);

    if (!cuenta) {
      return NextResponse.json({ message: "Cuenta no encontrada" }, { status: 404 });
    }

    return NextResponse.json(cuenta);
  } catch (error) {
    console.error("Error in GET /api/v1/comercial/cuentas/[id_cuenta]:", error);
    return NextResponse.json(
      { message: "Error al cargar la cuenta", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function PUT(request, context) {
  try {
    const idCuenta = await getIdCuenta(context);

    if (!idCuenta) {
      return NextResponse.json({ message: "id_cuenta es obligatorio" }, { status: 400 });
    }

    const body = await request.json();
    const cuenta = await updateCuenta(idCuenta, body);

    if (!cuenta) {
      return NextResponse.json({ message: "Cuenta no encontrada" }, { status: 404 });
    }

    return NextResponse.json(cuenta);
  } catch (error) {
    console.error("Error in PUT /api/v1/comercial/cuentas/[id_cuenta]:", error);
    return NextResponse.json(
      { message: "Error al actualizar la cuenta", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function DELETE(request, context) {
  try {
    const idCuenta = await getIdCuenta(context);

    if (!idCuenta) {
      return NextResponse.json({ message: "id_cuenta es obligatorio" }, { status: 400 });
    }

    const actor = new URL(request.url).searchParams.get("id_agente") || "";
    const cuenta = await deleteCuenta(idCuenta, actor);

    if (!cuenta) {
      return NextResponse.json({ message: "Cuenta no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, cuenta });
  } catch (error) {
    console.error("Error in DELETE /api/v1/comercial/cuentas/[id_cuenta]:", error);
    return NextResponse.json(
      { message: "Error al eliminar la cuenta", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
