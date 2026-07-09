import { NextResponse } from "next/server";
import { createNewsletter, getNewsletters } from "../../../../../server/features/revista/NewsletterRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    const newsletters = await getNewsletters({
      estado: params.get("estado")?.trim() || "",
    });
    return NextResponse.json(newsletters);
  } catch (error) {
    console.error("Error in GET /api/v1/produccion/newsletters:", error);
    return NextResponse.json({ message: "Error al cargar los newsletters", detail: process.env.NODE_ENV === "development" ? error.message : undefined }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const newsletter = await createNewsletter(body);
    return NextResponse.json(newsletter, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/v1/produccion/newsletters:", error);
    return NextResponse.json({ message: "Error al crear el newsletter", detail: process.env.NODE_ENV === "development" ? error.message : undefined }, { status: 500 });
  }
}
