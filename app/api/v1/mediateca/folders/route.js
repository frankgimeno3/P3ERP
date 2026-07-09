import { NextResponse } from "next/server";
import { createFolder, getFolders } from "../../../../../server/features/mediateca/MediatecaRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json(await getFolders({ path: params.get("path") || "" }));
  } catch (error) {
    return NextResponse.json({ message: "Error al cargar carpetas", detail: process.env.NODE_ENV === "development" ? error.message : undefined }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    return NextResponse.json(await createFolder(body), { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Error al crear carpeta" }, { status: 400 });
  }
}
