import { NextResponse } from "next/server";
import { createMedia, getMedia } from "../../../../../server/features/mediateca/MediatecaRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    return NextResponse.json(await getMedia({
      folderPath: params.get("folderPath") || "",
      folderId: params.get("folderId") || "",
      search: params.get("search") || "",
    }));
  } catch (error) {
    return NextResponse.json({ message: "Error al cargar archivos", detail: process.env.NODE_ENV === "development" ? error.message : undefined }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    return NextResponse.json(await createMedia(body), { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Error al registrar archivo" }, { status: 400 });
  }
}
