import { NextResponse } from "next/server";
import { getFolderByPath } from "../../../../../../server/features/mediateca/MediatecaRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json(await getFolderByPath(params.get("path") || ""));
  } catch (error) {
    return NextResponse.json({ message: "Error al cargar carpeta", detail: process.env.NODE_ENV === "development" ? error.message : undefined }, { status: 500 });
  }
}
