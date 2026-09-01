import { NextResponse } from "next/server";
import { getContactoEventos } from "../../../../../../../server/features/registroEventos/RegistroEventosRepository.js";

export const runtime = "nodejs";

export async function GET(_request, context) {
  try {
    const params = await context.params;
    const idContacto = params?.id_contacto;
    if (!idContacto) {
      return NextResponse.json({ message: "id_contacto es obligatorio" }, { status: 400 });
    }
    return NextResponse.json(await getContactoEventos(idContacto));
  } catch (error) {
    console.error("Error in GET /api/v1/comercial/contactos/[id_contacto]/registro-eventos:", error);
    return NextResponse.json(
      { message: "Error al cargar el registro de eventos", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
