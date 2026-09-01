import { NextResponse } from "next/server";
import { getMaterial, saveMaterial } from "../../../../../../server/features/material/MaterialRepository.js";

export const runtime = "nodejs";
export async function GET(_request, { params }) {
  const { id_material: id } = await params;
  const item = await getMaterial(id);
  return item ? NextResponse.json(item) : NextResponse.json({ message: "Material no encontrado" }, { status: 404 });
}
export async function PUT(request, { params }) {
  const { id_material: id } = await params;
  return NextResponse.json(await saveMaterial(id, await request.json()));
}
