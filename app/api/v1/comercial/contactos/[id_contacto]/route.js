import { NextResponse } from "next/server";
import { deleteContacto, unlinkContactoFromCuenta } from "../../../../../../server/features/contacto/ContactoRepository.js";

export const runtime = "nodejs";

async function getIdContacto(context) {
  const params = await context.params;
  return params?.id_contacto;
}

export async function PATCH(request, context) {
  try {
    const idContacto = await getIdContacto(context);

    if (!idContacto) {
      return NextResponse.json({ message: "id_contacto es obligatorio" }, { status: 400 });
    }

    const body = await request.json();
    const contacto = await unlinkContactoFromCuenta(idContacto, body?.id_cuenta || "");

    if (!contacto) {
      return NextResponse.json({ message: "Contacto no encontrado" }, { status: 404 });
    }

    return NextResponse.json(contacto);
  } catch (error) {
    console.error("Error in PATCH /api/v1/comercial/contactos/[id_contacto]:", error);
    return NextResponse.json(
      { message: "Error al desvincular el contacto", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function DELETE(_request, context) {
  try {
    const idContacto = await getIdContacto(context);

    if (!idContacto) {
      return NextResponse.json({ message: "id_contacto es obligatorio" }, { status: 400 });
    }

    const contacto = await deleteContacto(idContacto);

    if (!contacto) {
      return NextResponse.json({ message: "Contacto no encontrado" }, { status: 404 });
    }

    return NextResponse.json(contacto);
  } catch (error) {
    console.error("Error in DELETE /api/v1/comercial/contactos/[id_contacto]:", error);
    return NextResponse.json(
      { message: "Error al borrar el contacto", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
