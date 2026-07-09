import { NextResponse } from "next/server";
import { createContacto, getContactos } from "../../../../../server/features/contacto/ContactoRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const contactos = await getContactos({
      idCuenta: params.get("id_cuenta")?.trim() || "",
    });

    return NextResponse.json(contactos);
  } catch (error) {
    console.error("Error in GET /api/v1/comercial/contactos:", error);
    return NextResponse.json(
      { message: "Error al cargar los contactos", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body?.nombre_contacto || !body?.email_contacto) {
      return NextResponse.json({ message: "nombre_contacto y email_contacto son obligatorios" }, { status: 400 });
    }

    const contacto = await createContacto(body);
    return NextResponse.json(contacto, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/comercial/contactos:", error);
    return NextResponse.json(
      { message: "Error al crear el contacto", detail: process.env.NODE_ENV === "development" ? error.message : undefined },
      { status: 500 },
    );
  }
}
