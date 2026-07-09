import { NextResponse } from "next/server";
import { getNewsletterById, updateNewsletter } from "../../../../../../server/features/revista/NewsletterRepository.js";

export const runtime = "nodejs";

async function getId(context) {
  const params = await context.params;
  return params?.id_newsletter;
}

export async function GET(_request, context) {
  try {
    const idNewsletter = (await getId(context))?.trim();
    const newsletter = idNewsletter ? await getNewsletterById(idNewsletter) : null;
    if (!newsletter) return NextResponse.json({ message: "Newsletter no encontrado" }, { status: 404 });
    return NextResponse.json(newsletter);
  } catch (error) {
    console.error("Error in GET /api/v1/produccion/newsletters/[id_newsletter]:", error);
    return NextResponse.json({ message: "Error al cargar el newsletter", detail: process.env.NODE_ENV === "development" ? error.message : undefined }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const idNewsletter = (await getId(context))?.trim();
    const body = await request.json();
    const newsletter = idNewsletter ? await updateNewsletter(idNewsletter, body) : null;
    if (!newsletter) return NextResponse.json({ message: "Newsletter no encontrado" }, { status: 404 });
    return NextResponse.json(newsletter);
  } catch (error) {
    console.error("Error in PATCH /api/v1/produccion/newsletters/[id_newsletter]:", error);
    return NextResponse.json({ message: "Error al actualizar el newsletter", detail: process.env.NODE_ENV === "development" ? error.message : undefined }, { status: 500 });
  }
}
