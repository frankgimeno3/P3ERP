import { NextResponse } from "next/server";
import { getContactos } from "../../../../../server/features/contacto/ContactoRepository.js";

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
