import { NextResponse } from "next/server";
import { createFolder, getFolders } from "../../../../../server/features/mediateca/MediatecaRepository.js";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const params = new URL(request.url).searchParams;
    if (!params.get('path')) {
      const { ensureMediatecaStructure } = await import('../../../../../server/features/mediateca/MediatecaStructure.js');
      await ensureMediatecaStructure();
    }
    return NextResponse.json(await getFolders({ path: params.get("path") || "" }));
  } catch (error) {
    return NextResponse.json({ message: "Error al cargar carpetas", detail: process.env.NODE_ENV === "development" ? error.message : undefined }, { status: 500 });
  }
}

export async function POST(request) {
  if (!['operaciones','superadmin'].includes(request.headers.get('x-p3-actor-role'))) return NextResponse.json({ message: 'Permiso denegado' }, { status: 403 });
  try {
    const body = await request.json();
    return NextResponse.json(await createFolder(body), { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: error.message || "Error al crear carpeta" }, { status: 400 });
  }
}
