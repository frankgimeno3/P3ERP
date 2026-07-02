import { NextResponse } from "next/server";
import { deleteGmContacto, getGmCuentaByCodigo, upsertGmCuenta } from "../../../../../../server/features/gm/GmRepository.js";

export const runtime = "nodejs";

async function getCodigo(context) {
  const params = await context.params;
  return params?.codigo;
}

export async function GET(_request, context) {
  try {
    const codigo = await getCodigo(context);
    const result = await getGmCuentaByCodigo(codigo);

    if (!result) {
      return NextResponse.json({ message: "Cuenta no encontrada" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in GET /api/v1/gm/cuentas/[codigo]:", error);
    return NextResponse.json(
      { message: "Error al cargar cuenta GM", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function PUT(request, context) {
  try {
    const codigo = await getCodigo(context);
    const body = await request.json();
    const result = await upsertGmCuenta({ ...body.cuenta, codigo }, body.contactos || []);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in PUT /api/v1/gm/cuentas/[codigo]:", error);
    return NextResponse.json(
      { message: "Error al actualizar cuenta GM", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function DELETE(request, context) {
  try {
    const codigo = await getCodigo(context);
    const params = new URL(request.url).searchParams;
    const idContacto = params.get("contacto");

    if (!idContacto) {
      return NextResponse.json({ message: "contacto es obligatorio" }, { status: 400 });
    }

    await deleteGmContacto(idContacto, codigo);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in DELETE /api/v1/gm/cuentas/[codigo]:", error);
    return NextResponse.json(
      { message: "Error al borrar contacto GM", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
